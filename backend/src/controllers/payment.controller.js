const prisma = require("../config/db");
const { uploadToCloudinary } = require("../lib/cloudinary");
const { generateReceiptNumber, buildSchoolPrefix } = require("../lib/utils");
const { sendNotifications } = require("../lib/notifier");
const { reconcileVerifiedPayment } = require("../lib/paymentReconciliation");

//  HELPER — Calculate debtor status
const calculateDebtorStatus = async (
  tx,
  studentId,
  classId,
  schoolId,
  term,
  academicYear,
) => {
  const [feeStructure, paymentsAggregate] = await Promise.all([
    tx.feeStructure.findFirst({
      where: { schoolId, classId, term, academicYear, isActive: true },
    }),
    tx.feePayment.aggregate({
      where: { studentId, term, academicYear, status: "VERIFIED" },
      _sum: { amount: true },
    }),
  ]);

  const requiredAmount = feeStructure?.totalAmount
    ? Number(feeStructure.totalAmount)
    : null;
  const totalPaid = Number(paymentsAggregate._sum.amount) || 0;
  const balance = requiredAmount !== null ? requiredAmount - totalPaid : null;
  const isDebtor = balance !== null ? balance > 0 : false;

  return { requiredAmount, totalPaid, balance, isDebtor };
};

// 🎯 RENAMED & FIXED: Accepts any manual payment method (CASH, BANK, MOBILE)
const recordManualPayment = async (req, res) => {
  try {
    const { studentId, amount, term, academicYear, notes, paymentMethod } =
      req.body;

    if (!studentId || !amount || !term) {
      return res.status(400).json({
        success: false,
        message: "studentId, amount and term are required",
      });
    }

    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: req.schoolId },
      include: { class: true, school: true },
    });

    if (!student)
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });

    const year = academicYear || new Date().getFullYear().toString();
    const parsedAmount = Number(amount);
    const resolvedMethod = paymentMethod || "CASH"; // Fallback to CASH if not provided

    //  Wrap in transaction for atomicity and receipt race-condition prevention
    const result = await prisma.$transaction(async (tx) => {
      const feeStructure = await tx.feeStructure.findFirst({
        where: {
          schoolId: req.schoolId,
          classId: student.classId,
          term,
          academicYear: year,
          isActive: true,
        },
      });

      const requiredAmount = feeStructure?.totalAmount
        ? Number(feeStructure.totalAmount)
        : null;

      const alreadyPaidAggregate = await tx.feePayment.aggregate({
        where: { studentId, term, academicYear: year, status: "VERIFIED" },
        _sum: { amount: true },
      });
      const alreadyPaid = Number(alreadyPaidAggregate._sum.amount) || 0;

      const balanceBefore =
        requiredAmount !== null
          ? Math.max(0, requiredAmount - alreadyPaid)
          : null;

      let amountToApply = parsedAmount;
      let overpayment = 0;
      let newCreditBalance = Number(student.creditBalance) || 0;

      if (balanceBefore !== null && parsedAmount > balanceBefore) {
        overpayment = parsedAmount - balanceBefore;
        amountToApply = balanceBefore;
        newCreditBalance = Number(student.creditBalance) + overpayment;
      }

      const paymentCount = await tx.feePayment.count({
        where: { schoolId: req.schoolId },
      });
      const schoolPrefix = buildSchoolPrefix(student.school.name);
      const receiptNumber = generateReceiptNumber(
        schoolPrefix,
        year,
        paymentCount + 1,
      );

      const totalPaidAfter = alreadyPaid + amountToApply;
      const balanceAfter =
        requiredAmount !== null
          ? Math.max(0, requiredAmount - totalPaidAfter)
          : null;
      const isDebtor = balanceAfter !== null ? balanceAfter > 0 : false;

      const payment = await tx.feePayment.create({
        data: {
          schoolId: req.schoolId,
          studentId,
          amount: parsedAmount,
          paymentMethod: resolvedMethod, // 🎯 FIXED: Uses the selected method
          term,
          academicYear: year,
          receiptNumber,
          submittedBy: "BURSAR",
          status: "VERIFIED",
          notes: notes || null,
          recordedById: req.staff.id,
          verifiedById: req.staff.id,
          verifiedAt: new Date(),
          requiredAmount,
          balance: balanceAfter,
          isDebtor,
          overpayment,
          creditApplied: 0,
        },
        include: {
          student: {
            select: {
              fullName: true,
              studentCode: true,
              parentPhone: true,
              parentEmail: true,
              parentName: true,
              class: { select: { name: true } },
            },
          },
          recordedBy: { select: { fullName: true } },
        },
      });

      if (overpayment > 0) {
        await tx.student.update({
          where: { id: studentId },
          data: { creditBalance: newCreditBalance },
        });
      }

      await tx.auditLog.create({
        data: {
          schoolId: req.schoolId,
          staffId: req.staff.id,
          action: "PAYMENT_RECORDED",
          entity: "FeePayment",
          entityId: payment.id,
          changes: {
            amount,
            term,
            studentId,
            receiptNumber,
            overpayment,
            paymentMethod: resolvedMethod,
          },
        },
      });

      return {
        payment,
        receiptNumber,
        requiredAmount,
        alreadyPaid,
        balanceAfter,
        isDebtor,
        overpayment,
        newCreditBalance,
      };
    });

    // Send Notification
    const smsMessage =
      result.overpayment > 0
        ? `Payment of MWK ${parsedAmount.toLocaleString()} received for ${result.payment.student.fullName}. Receipt: ${result.receiptNumber}. Fees fully paid! MWK ${result.overpayment.toLocaleString()} credit saved for next term.`
        : result.balanceAfter && result.balanceAfter > 0
          ? `Payment of MWK ${parsedAmount.toLocaleString()} received for ${result.payment.student.fullName}. Receipt: ${result.receiptNumber}. Balance remaining: MWK ${result.balanceAfter.toLocaleString()}`
          : `Payment of MWK ${parsedAmount.toLocaleString()} received for ${result.payment.student.fullName}. Receipt: ${result.receiptNumber}. Fees fully paid!`;

    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: { name: true, notificationDefaults: true },
    });

    sendNotifications({
      recipients: [
        {
          phone: result.payment.student.parentPhone,
          email: result.payment.student.parentEmail,
          name: result.payment.student.parentName || "Parent",
          message: smsMessage,
          subject: `Payment Received — ${school.name}`,
          templateData: {
            studentName: result.payment.student.fullName,
            amount: parsedAmount,
            receiptNumber: result.receiptNumber,
            balanceAfter: result.balanceAfter,
            overpayment: result.overpayment,
          },
        },
      ],
      channel: school?.notificationDefaults?.defaultChannel || "BOTH",
      type: "payment_received",
      templateKey: "payment_received",
      schoolId: req.schoolId,
      staffId: req.staff.id,
      schoolName: school.name,
    }).catch((e) => console.error("Payment notification error:", e));

    return res.status(201).json({
      success: true,
      message: "Payment recorded successfully",
      data: {
        ...result.payment,
        debtorStatus: {
          requiredAmount: result.requiredAmount,
          alreadyPaid: result.alreadyPaid,
          amountPaidNow: parsedAmount,
          balanceRemaining: result.balanceAfter,
          isDebtor: result.isDebtor,
          overpayment: result.overpayment,
          creditBalance: result.newCreditBalance,
        },
      },
    });
  } catch (error) {
    console.error("Record manual payment error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to record payment" });
  }
};

const submitPayment = async (req, res) => {
  // ... (Keep exactly as it is - no changes needed here)
  try {
    const {
      studentId,
      amount,
      paymentMethod,
      term,
      academicYear,
      bankReference,
    } = req.body;

    if (!studentId || !amount || !paymentMethod || !term) {
      return res.status(400).json({
        success: false,
        message: "studentId, amount, paymentMethod and term are required",
      });
    }

    if (req.student.id !== studentId)
      return res.status(403).json({
        success: false,
        message: "You can only submit payments for your own child",
      });

    const year = academicYear || new Date().getFullYear().toString();

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { school: { select: { name: true } }, class: true },
    });

    const feeStructure = await prisma.feeStructure.findFirst({
      where: {
        schoolId: req.student.schoolId,
        classId: req.student.classId,
        term,
        academicYear: year,
        isActive: true,
      },
    });

    let receiptImageUrl = null;
    if (req.file) {
      try {
        const uploadResult = await uploadToCloudinary(req.file.buffer, {
          folder: `school_fees_receipts/${req.student.schoolId}`,
          public_id: `receipt_${studentId}_${term}_${year}_${Date.now()}`,
          resource_type: "auto",
        });
        receiptImageUrl = uploadResult.secure_url;
      } catch (uploadErr) {
        return res.status(500).json({
          success: false,
          message: "Failed to upload receipt. Please try again.",
        });
      }
    }

    if (!receiptImageUrl && paymentMethod !== "CASH") {
      return res.status(400).json({
        success: false,
        message: "Please upload your payment receipt",
      });
    }

    const paymentCount = await prisma.feePayment.count({
      where: { schoolId: req.student.schoolId },
    });
    const schoolPrefix = buildSchoolPrefix(student.school.name);
    const receiptNumber = generateReceiptNumber(
      schoolPrefix,
      year,
      paymentCount + 1,
    );

    const payment = await prisma.feePayment.create({
      data: {
        schoolId: req.student.schoolId,
        studentId,
        amount: Number(amount),
        paymentMethod,
        term,
        academicYear: year,
        receiptNumber,
        receiptImage: receiptImageUrl,
        bankReference: bankReference || null,
        submittedBy: "PARENT",
        status: "PENDING",
        parentPhone: req.parentPhone,
        requiredAmount: feeStructure?.totalAmount || null,
      },
      include: {
        student: {
          select: {
            fullName: true,
            studentCode: true,
            school: { select: { name: true } },
            class: { select: { name: true } },
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message:
        "Payment submitted successfully. The school will verify it shortly.",
      data: payment,
    });
  } catch (error) {
    console.error("Submit payment error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to submit payment" });
  }
};

const verifyPayment = async (req, res) => {
  // ... (Keep exactly as it is)
  try {
    const { id } = req.params;
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.feePayment.findFirst({
        where: { id, schoolId: req.schoolId },
        include: {
          student: {
            select: {
              fullName: true,
              parentPhone: true,
              parentEmail: true,
              parentName: true,
              classId: true,
              class: { select: { name: true } },
            },
          },
        },
      });

      if (!payment) throw new Error("NOT_FOUND");
      if (payment.status !== "PENDING") throw new Error("ALREADY_PROCESSED");

      const verified = await tx.feePayment.update({
        where: { id },
        data: {
          status: "VERIFIED",
          verifiedById: req.staff.id,
          verifiedAt: new Date(),
        },
        include: {
          student: {
            select: {
              fullName: true,
              studentCode: true,
              parentPhone: true,
              classId: true,
              class: { select: { name: true } },
            },
          },
          verifiedBy: { select: { fullName: true } },
        },
      });

      // 🎯 Old inline balance/overpayment math replaced by the shared helper
      const reconcile = await reconcileVerifiedPayment(tx, verified);

      await tx.auditLog.create({
        data: {
          schoolId: req.schoolId,
          staffId: req.staff.id,
          action: "PAYMENT_VERIFIED",
          entity: "FeePayment",
          entityId: id,
          changes: { verifiedBy: req.staff.fullName },
        },
      });

      return {
        verified,
        payment,
        finalBalance: reconcile.balance,
        finalIsDebtor: reconcile.isDebtor,
        deltaOverpay: reconcile.overpayment,
      };
    });

    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: { name: true, notificationDefaults: true },
    });
    sendNotifications({
      recipients: [
        {
          phone: result.payment.student.parentPhone,
          email: result.payment.student.parentEmail,
          name: result.payment.student.parentName || "Parent",
          message:
            `Payment of MWK ${Number(result.payment.amount).toLocaleString()} for ${result.payment.student.fullName} has been confirmed. Receipt: ${result.payment.receiptNumber}` +
            (result.finalBalance && result.finalBalance > 0
              ? `. Balance: MWK ${result.finalBalance.toLocaleString()}`
              : ". Fully paid!"),
          subject: `Payment Confirmed — ${school.name}`,
          templateData: {
            studentName: result.payment.student.fullName,
            amount: Number(result.payment.amount),
            receiptNumber: result.payment.receiptNumber,
            balanceAfter: result.finalBalance,
          },
        },
      ],
      channel: school?.notificationDefaults?.defaultChannel || "BOTH",
      type: "payment_verified",
      templateKey: "payment_verified",
      schoolId: req.schoolId,
      staffId: req.staff.id,
      schoolName: school.name,
    }).catch((e) => console.error("Verify notification error:", e));

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      data: result.verified,
    });
  } catch (error) {
    if (error.message === "NOT_FOUND")
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    if (error.message === "ALREADY_PROCESSED")
      return res
        .status(400)
        .json({ success: false, message: "Payment is already processed" });
    console.error("Verify payment error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to verify payment" });
  }
};

const rejectPayment = async (req, res) => {
  // ... (Keep exactly as it is)
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason)
      return res
        .status(400)
        .json({ success: false, message: "Rejection reason is required" });

    const payment = await prisma.feePayment.findFirst({
      where: { id, schoolId: req.schoolId },
    });
    if (!payment)
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    if (payment.status !== "PENDING")
      return res.status(400).json({
        success: false,
        message: `Payment is already ${payment.status.toLowerCase()}`,
      });

    const rejected = await prisma.$transaction(async (tx) => {
      const updated = await tx.feePayment.update({
        where: { id },
        data: {
          status: "REJECTED",
          rejectionReason: reason,
          verifiedById: req.staff.id,
          verifiedAt: new Date(),
        },
        include: {
          student: {
            select: {
              fullName: true,
              parentPhone: true,
              parentEmail: true,
              parentName: true,
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          schoolId: req.schoolId,
          staffId: req.staff.id,
          action: "PAYMENT_REJECTED",
          entity: "FeePayment",
          entityId: id,
          changes: { reason },
        },
      });

      return updated;
    });

    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: { name: true, notificationDefaults: true },
    });
    sendNotifications({
      recipients: [
        {
          phone: rejected.student.parentPhone,
          email: rejected.student.parentEmail,
          name: rejected.student.parentName || "Parent",
          message: `Payment for ${rejected.student.fullName} rejected. Reason: ${reason}. Please resubmit.`,
          subject: `Payment Rejected — ${school.name}`,
          templateData: { studentName: rejected.student.fullName, reason },
        },
      ],
      channel: school?.notificationDefaults?.defaultChannel || "BOTH",
      type: "payment_rejected",
      templateKey: "payment_rejected",
      schoolId: req.schoolId,
      staffId: req.staff.id,
      schoolName: school.name,
    }).catch((e) => console.error("Reject notification error:", e));

    return res
      .status(200)
      .json({ success: true, message: "Payment rejected", data: rejected });
  } catch (error) {
    console.error("Reject payment error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to reject payment" });
  }
};

const getPayments = async (req, res) => {
  // ... (Keep exactly as it is)
  try {
    const {
      status,
      term,
      academicYear,
      studentId,
      classId,
      page = 1,
      limit = 20,
    } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { schoolId: req.schoolId };
    if (status) where.status = status;
    if (term) where.term = term;
    if (academicYear) where.academicYear = academicYear;
    if (studentId) where.studentId = studentId;
    if (classId) where.student = { classId };

    const [payments, total] = await Promise.all([
      prisma.feePayment.findMany({
        where,
        include: {
          student: {
            select: {
              fullName: true,
              studentCode: true,
              class: { select: { name: true } },
            },
          },
          recordedBy: { select: { fullName: true } },
          verifiedBy: { select: { fullName: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.feePayment.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: payments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get payments error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to get payments" });
  }
};

const getPendingPayments = async (req, res) => {
  // ... (Keep exactly as it is)
  try {
    const payments = await prisma.feePayment.findMany({
      where: { schoolId: req.schoolId, status: "PENDING" },
      include: {
        student: {
          select: {
            fullName: true,
            studentCode: true,
            parentName: true,
            parentPhone: true,
            class: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    return res
      .status(200)
      .json({ success: true, data: payments, total: payments.length });
  } catch (error) {
    console.error("Get pending payments error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to get pending payments" });
  }
};

const getMyChildPayments = async (req, res) => {
  // ... (Keep exactly as it is)
  try {
    const payments = await prisma.feePayment.findMany({
      where: { studentId: req.student.id },
      select: {
        id: true,
        amount: true,
        platformFee: true,
        netAmount: true,
        paymentMethod: true,
        term: true,
        academicYear: true,
        receiptNumber: true,
        status: true,
        submittedBy: true,
        bankReference: true,
        rejectionReason: true,
        requiredAmount: true,
        balance: true,
        isDebtor: true,
        createdAt: true,
        verifiedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const totalPaid = payments
      .filter((p) => p.status === "VERIFIED")
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const pendingAmount = payments
      .filter((p) => p.status === "PENDING")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    return res.status(200).json({
      success: true,
      data: {
        payments,
        summary: { totalPaid, pendingAmount, totalPayments: payments.length },
      },
    });
  } catch (error) {
    console.error("Get my child payments error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to get payment history" });
  }
};

const getPaymentSummary = async (req, res) => {
  // ... (Keep exactly as it is)
  try {
    const { term, academicYear } = req.query;
    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: { activeTerm: true, activeAcademicYear: true },
    });

    const year =
      academicYear ||
      school?.activeAcademicYear ||
      new Date().getFullYear().toString();
    const resolvedTerm = term || school?.activeTerm || null;
    const baseWhere = { schoolId: req.schoolId, academicYear: year };
    if (resolvedTerm) baseWhere.term = resolvedTerm;

    const [
      totalCashReceivedAgg,
      totalFeesAgg,
      todayCollectedAgg,
      pendingCount,
      verifiedCount,
      rejectedCount,
      totalStudents,
    ] = await Promise.all([
      prisma.feePayment.aggregate({
        where: { ...baseWhere, status: "VERIFIED" },
        _sum: { amount: true, netAmount: true },
      }),
      prisma.feePayment.aggregate({
        where: { ...baseWhere, status: "VERIFIED" },
        _sum: { platformFee: true },
      }),
      prisma.feePayment.aggregate({
        where: {
          ...baseWhere,
          status: "VERIFIED",
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
        _sum: { amount: true },
      }),
      prisma.feePayment.count({ where: { ...baseWhere, status: "PENDING" } }),
      prisma.feePayment.count({ where: { ...baseWhere, status: "VERIFIED" } }),
      prisma.feePayment.count({ where: { ...baseWhere, status: "REJECTED" } }),
      prisma.student.count({
        where: { schoolId: req.schoolId, isActive: true },
      }),
    ]);

    const students = await prisma.student.findMany({
      where: { schoolId: req.schoolId, isActive: true },
      include: {
        class: {
          include: {
            feeStructures: {
              where: resolvedTerm
                ? { term: resolvedTerm, academicYear: year, isActive: true }
                : { academicYear: year, isActive: true },
            },
          },
        },
      },
    });

    const paymentGroups = await prisma.feePayment.groupBy({
      by: ["studentId"],
      where: { ...baseWhere, status: "VERIFIED" },
      _sum: { amount: true },
    });
    const paidByStudent = Object.fromEntries(
      paymentGroups.map((p) => [p.studentId, Number(p._sum.amount) || 0]),
    );

    let totalRequired = 0,
      totalCollected = 0,
      totalCredit = 0,
      paidFullCount = 0,
      debtorCount = 0,
      noFeeCount = 0;

    for (const s of students) {
      const fee = s.class.feeStructures[0]?.totalAmount
        ? Number(s.class.feeStructures[0].totalAmount)
        : 0;
      if (fee === 0) {
        noFeeCount++;
        continue;
      }
      const paid = paidByStudent[s.id] || 0;
      totalRequired += fee;
      totalCollected += Math.min(paid, fee);
      totalCredit += Math.max(0, paid - fee);
      if (paid >= fee) paidFullCount++;
      else debtorCount++;
    }

    return res.status(200).json({
      success: true,
      data: {
        totalRequired,
        totalCollected,
        outstandingBalance: Math.max(0, totalRequired - totalCollected),
        totalCredit,
        totalCashReceived: Number(totalCashReceivedAgg._sum.amount) || 0,
        totalFees: Number(totalFeesAgg._sum.platformFee) || 0,
        totalNetCollected:
          Number(totalCashReceivedAgg._sum.netAmount) ||
          Number(totalCashReceivedAgg._sum.amount) ||
          0,
        todayCollected: Number(todayCollectedAgg._sum.amount) || 0,
        pendingCount,
        verifiedCount,
        rejectedCount,
        totalStudents,
        paidStudents: paidFullCount,
        unpaidStudents: debtorCount,
        debtorCount,
        noFeeCount,
        academicYear: year,
        term: resolvedTerm,
      },
    });
  } catch (error) {
    console.error("Get payment summary error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to get summary" });
  }
};

const getPaymentInsights = async (req, res) => {
  // ... (Keep exactly as it is)
  try {
    const { term, academicYear } = req.query;
    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: { activeTerm: true, activeAcademicYear: true },
    });
    const year = academicYear || school?.activeAcademicYear;
    const resolvedTerm = term || school?.activeTerm;

    const baseWhere = { schoolId: req.schoolId };
    if (year) baseWhere.academicYear = year;
    if (resolvedTerm) baseWhere.term = resolvedTerm;

    const payments = await prisma.feePayment.findMany({
      where: { ...baseWhere, status: "VERIFIED" },
      select: {
        id: true,
        amount: true,
        paymentMethod: true,
        paymentChannel: true,
        createdAt: true,
      },
    });

    const BANK_METHODS = [
      "NATIONAL_BANK",
      "STANDARD_BANK",
      "FDH_BANK",
      "NBS_BANK",
      "OTHER_BANK",
    ];
    const MOBILE_METHODS = ["AIRTEL_MONEY", "TNM_MPAMBA"];

    const channels = {
      onekhusa_online: {
        count: 0,
        amount: 0,
        label: "OneKhusa Online",
        description: "Auto-verified via mobile money",
        color: "emerald",
      },
      mobile_manual: {
        count: 0,
        amount: 0,
        label: "Mobile Money",
        description: "Airtel/Mpamba with receipt",
        color: "amber",
      },
      bank_manual: {
        count: 0,
        amount: 0,
        label: "Bank Transfer",
        description: "Bank deposit with receipt",
        color: "blue",
      },
      cash: {
        count: 0,
        amount: 0,
        label: "Cash",
        description: "Recorded by bursar at office",
        color: "slate",
      },
    };

    for (const p of payments) {
      const amt = Number(p.amount);
      if (p.paymentChannel === "ONEKHUSA") {
        channels.onekhusa_online.count++;
        channels.onekhusa_online.amount += amt;
      } else if (p.paymentMethod === "CASH") {
        channels.cash.count++;
        channels.cash.amount += amt;
      } else if (BANK_METHODS.includes(p.paymentMethod)) {
        channels.bank_manual.count++;
        channels.bank_manual.amount += amt;
      } else if (MOBILE_METHODS.includes(p.paymentMethod)) {
        channels.mobile_manual.count++;
        channels.mobile_manual.amount += amt;
      }
    }

    const totalAmount = Object.values(channels).reduce(
      (s, c) => s + c.amount,
      0,
    );
    const totalCount = Object.values(channels).reduce((s, c) => s + c.count, 0);
    const breakdown = Object.entries(channels)
      .map(([key, c]) => ({
        key,
        ...c,
        percent:
          totalAmount > 0 ? Math.round((c.amount / totalAmount) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayOnlinePayments = payments.filter(
      (p) =>
        p.paymentChannel === "ONEKHUSA" && new Date(p.createdAt) >= todayStart,
    );
    const todayOnlineAmount = todayOnlinePayments.reduce(
      (s, p) => s + Number(p.amount),
      0,
    );

    const [onekhusaPending, onekhusaFailed] = await Promise.all([
      prisma.feePayment.count({
        where: { ...baseWhere, paymentChannel: "ONEKHUSA", status: "PENDING" },
      }),
      prisma.feePayment.count({
        where: { ...baseWhere, paymentChannel: "ONEKHUSA", status: "REJECTED" },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalAmount,
        totalCount,
        todayOnline: {
          amount: todayOnlineAmount,
          count: todayOnlinePayments.length,
        },
        onekhusaPending,
        onekhusaFailed,
        channels: breakdown,
        academicYear: year,
        term: resolvedTerm,
      },
    });
  } catch (error) {
    console.error("Get payment insights error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load insights" });
  }
};

module.exports = {
  recordManualPayment,
  submitPayment,
  verifyPayment,
  rejectPayment,
  getPayments,
  getPendingPayments,
  getMyChildPayments,
  getPaymentSummary,
  getPaymentInsights,
};
