const prisma = require("../config/db");
const { uploadToCloudinary } = require("../lib/cloudinary");
const { generateReceiptNumber } = require("../lib/utils");

// ==================== HELPER — Calculate debtor status ====================
// Gets total verified payments for a student for a specific term
// Compares against fee structure to determine if debtor
const calculateDebtorStatus = async (
  studentId,
  classId,
  schoolId,
  term,
  academicYear,
) => {
  const [feeStructure, paymentsAggregate] = await Promise.all([
    prisma.feeStructure.findFirst({
      where: { schoolId, classId, term, academicYear, isActive: true },
    }),
    prisma.feePayment.aggregate({
      where: { studentId, term, academicYear, status: "VERIFIED" },
      _sum: { amount: true },
    }),
  ]);

  const requiredAmount = feeStructure?.totalAmount || null;
  const totalPaid = paymentsAggregate._sum.amount || 0;
  const balance = requiredAmount !== null ? requiredAmount - totalPaid : null;
  const isDebtor = balance !== null ? balance > 0 : false;

  return { requiredAmount, totalPaid, balance, isDebtor };
};

const recordCashPayment = async (req, res) => {
  try {
    const { studentId, amount, term, academicYear, notes } = req.body;

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

    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    const year = academicYear || new Date().getFullYear().toString();
    const parsedAmount = parseFloat(amount);

    // Get fee structure
    const feeStructure = await prisma.feeStructure.findFirst({
      where: {
        schoolId: req.schoolId,
        classId: student.classId,
        term,
        academicYear: year,
        isActive: true,
      },
    });

    const requiredAmount = feeStructure?.totalAmount || null;

    // Get already paid this term
    const alreadyPaidAggregate = await prisma.feePayment.aggregate({
      where: { studentId, term, academicYear: year, status: "VERIFIED" },
      _sum: { amount: true },
    });
    const alreadyPaid = alreadyPaidAggregate._sum.amount || 0;

    // Calculate balance before this payment
    const balanceBefore =
      requiredAmount !== null
        ? Math.max(0, requiredAmount - alreadyPaid)
        : null;

    // Calculate overpayment
    let amountToApply = parsedAmount;
    let overpayment = 0;
    let newCreditBalance = student.creditBalance;

    if (balanceBefore !== null && parsedAmount > balanceBefore) {
      overpayment = parsedAmount - balanceBefore;
      amountToApply = balanceBefore;
      newCreditBalance = student.creditBalance + overpayment;
    }

    // Generate receipt
    const paymentCount = await prisma.feePayment.count({
      where: { schoolId: req.schoolId },
    });
    const receiptNumber = generateReceiptNumber(year, paymentCount + 1);

    // Calculate new balance after payment
    const totalPaidAfter = alreadyPaid + amountToApply;
    const balanceAfter =
      requiredAmount !== null
        ? Math.max(0, requiredAmount - totalPaidAfter)
        : null;
    const isDebtor = balanceAfter !== null ? balanceAfter > 0 : false;

    // Create payment record
    const payment = await prisma.feePayment.create({
      data: {
        schoolId: req.schoolId,
        studentId,
        amount: parsedAmount,
        paymentMethod: "CASH",
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
            parentName: true,
            class: { select: { name: true } },
          },
        },
        recordedBy: { select: { fullName: true } },
      },
    });

    // Update student credit balance if overpayment
    if (overpayment > 0) {
      await prisma.student.update({
        where: { id: studentId },
        data: { creditBalance: newCreditBalance },
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        schoolId: req.schoolId,
        staffId: req.staff.id,
        action: "PAYMENT_RECORDED",
        entity: "FeePayment",
        entityId: payment.id,
        changes: { amount, term, studentId, receiptNumber, overpayment },
      },
    });

    // SMS log
    const smsMessage =
      overpayment > 0
        ? `Payment of MWK ${parsedAmount.toLocaleString()} received for ${payment.student.fullName}. Receipt: ${receiptNumber}. Fees fully paid! MWK ${overpayment.toLocaleString()} credit saved for next term.`
        : balanceAfter && balanceAfter > 0
          ? `Payment of MWK ${parsedAmount.toLocaleString()} received for ${payment.student.fullName}. Receipt: ${receiptNumber}. Balance remaining: MWK ${balanceAfter.toLocaleString()}`
          : `Payment of MWK ${parsedAmount.toLocaleString()} received for ${payment.student.fullName}. Receipt: ${receiptNumber}. Fees fully paid!`;

    console.log(`📱 SMS to ${payment.student.parentPhone}: ${smsMessage}`);

    return res.status(201).json({
      success: true,
      message: "Payment recorded successfully",
      data: {
        ...payment,
        debtorStatus: {
          requiredAmount,
          alreadyPaid,
          amountPaidNow: parsedAmount,
          balanceRemaining: balanceAfter,
          isDebtor,
          overpayment,
          creditBalance: newCreditBalance,
        },
      },
    });
  } catch (error) {
    console.error("Record cash payment error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to record payment" });
  }
};

const submitPayment = async (req, res) => {
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

    if (req.student.id !== studentId) {
      return res.status(403).json({
        success: false,
        message: "You can only submit payments for your own child",
      });
    }

    const year = academicYear || new Date().getFullYear().toString();

    // Get fee structure so parent can see required amount
    const feeStructure = await prisma.feeStructure.findFirst({
      where: {
        schoolId: req.student.schoolId,
        classId: req.student.classId,
        term,
        academicYear: year,
        isActive: true,
      },
    });

    // Upload receipt to Cloudinary if provided
    let receiptImageUrl = null;
    let receiptPublicId = null;

    if (req.file) {
      try {
        const uploadResult = await uploadToCloudinary(req.file.buffer, {
          folder: `school_fees_receipts/${req.student.schoolId}`,
          public_id: `receipt_${studentId}_${term}_${year}_${Date.now()}`,
          resource_type: "auto",
        });
        receiptImageUrl = uploadResult.secure_url;
        receiptPublicId = uploadResult.public_id;
      } catch (uploadErr) {
        console.error("Cloudinary upload failed:", uploadErr);
        return res.status(500).json({
          success: false,
          message: "Failed to upload receipt. Please try again.",
        });
      }
    }

    // Require receipt for non-cash payments
    if (!receiptImageUrl && paymentMethod !== "CASH") {
      return res.status(400).json({
        success: false,
        message: "Please upload your payment receipt",
      });
    }

    const paymentCount = await prisma.feePayment.count({
      where: { schoolId: req.student.schoolId },
    });
    const receiptNumber = generateReceiptNumber(year, paymentCount + 1);

    const payment = await prisma.feePayment.create({
      data: {
        schoolId: req.student.schoolId,
        studentId,
        amount: parseFloat(amount),
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

    console.log(
      `📱 SMS to ${req.parentPhone}: Your payment of MWK ${amount} for ${payment.student.fullName} has been submitted. Receipt: ${receiptNumber}. The school will verify shortly.`,
    );

    return res.status(201).json({
      success: true,
      message:
        "Payment submitted successfully. The school will verify it shortly.",
      data: payment,
    });
  } catch (error) {
    console.error("Submit payment error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit payment",
    });
  }
};

// ==================== BURSAR VERIFIES PAYMENT ====================
// PATCH /api/payments/:id/verify
const verifyPayment = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await prisma.feePayment.findFirst({
      where: { id, schoolId: req.schoolId },
      include: {
        student: {
          select: {
            fullName: true,
            parentPhone: true,
            parentName: true,
            classId: true,
            class: { select: { name: true } },
          },
        },
      },
    });

    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }

    if (payment.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `Payment is already ${payment.status.toLowerCase()}`,
      });
    }

    const verified = await prisma.feePayment.update({
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

    // Recalculate debtor status after verification
    const debtorStatus = await calculateDebtorStatus(
      payment.studentId,
      payment.student.classId,
      req.schoolId,
      payment.term,
      payment.academicYear,
    );

    await prisma.feePayment.updateMany({
      where: {
        studentId: payment.studentId,
        term: payment.term,
        academicYear: payment.academicYear,
        status: "VERIFIED",
      },
      data: {
        balance: debtorStatus.balance,
        isDebtor: debtorStatus.isDebtor,
      },
    });

    verified.balance = debtorStatus.balance;
    verified.isDebtor = debtorStatus.isDebtor;

    await prisma.auditLog.create({
      data: {
        schoolId: req.schoolId,
        staffId: req.staff.id,
        action: "PAYMENT_VERIFIED",
        entity: "FeePayment",
        entityId: id,
        changes: { verifiedBy: req.staff.fullName },
      },
    });

    console.log(
      `📱 SMS to ${payment.student.parentPhone}: Payment of MWK ${payment.amount} for ${payment.student.fullName} CONFIRMED. Receipt: ${payment.receiptNumber}${debtorStatus.balance && debtorStatus.balance > 0 ? `. Balance: MWK ${debtorStatus.balance.toLocaleString()}` : ". Fully paid!"}`,
    );

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      data: { ...verified, debtorStatus },
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify payment",
    });
  }
};

// ==================== BURSAR REJECTS PAYMENT ====================
// PATCH /api/payments/:id/reject
const rejectPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const payment = await prisma.feePayment.findFirst({
      where: { id, schoolId: req.schoolId },
    });

    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }

    if (payment.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `Payment is already ${payment.status.toLowerCase()}`,
      });
    }

    const rejected = await prisma.feePayment.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionReason: reason,
        verifiedById: req.staff.id,
        verifiedAt: new Date(),
      },
      include: {
        student: { select: { fullName: true, parentPhone: true } },
      },
    });

    console.log(
      `📱 SMS to ${rejected.student.parentPhone}: Payment for ${rejected.student.fullName} rejected. Reason: ${reason}. Please resubmit.`,
    );

    return res.status(200).json({
      success: true,
      message: "Payment rejected",
      data: rejected,
    });
  } catch (error) {
    console.error("Reject payment error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reject payment",
    });
  }
};

// ==================== GET ALL PAYMENTS ====================
// GET /api/payments
const getPayments = async (req, res) => {
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

    // Filter by class via student relation
    if (classId) {
      where.student = { classId };
    }

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

// ==================== GET PENDING PAYMENTS ====================
// GET /api/payments/pending
const getPendingPayments = async (req, res) => {
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

    return res.status(200).json({
      success: true,
      data: payments,
      total: payments.length,
    });
  } catch (error) {
    console.error("Get pending payments error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to get pending payments" });
  }
};

// ==================== GET PARENT CHILD PAYMENTS ====================
// GET /api/payments/my-child
const getMyChildPayments = async (req, res) => {
  try {
    const payments = await prisma.feePayment.findMany({
      where: { studentId: req.student.id },
      select: {
        id: true,
        amount: true,
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
      .reduce((sum, p) => sum + p.amount, 0);

    const pendingAmount = payments
      .filter((p) => p.status === "PENDING")
      .reduce((sum, p) => sum + p.amount, 0);

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

// ==================== DASHBOARD SUMMARY ====================
// GET /api/payments/summary
const getPaymentSummary = async (req, res) => {
  try {
    const { term, academicYear } = req.query;
    const year = academicYear || new Date().getFullYear().toString();

    const where = { schoolId: req.schoolId, academicYear: year };
    if (term) where.term = term;

    const [
      totalCollected,
      todayCollected,
      pendingCount,
      verifiedCount,
      rejectedCount,
      totalStudents,
      debtorStudents,
    ] = await Promise.all([
      prisma.feePayment.aggregate({
        where: { ...where, status: "VERIFIED" },
        _sum: { amount: true },
      }),
      prisma.feePayment.aggregate({
        where: {
          ...where,
          status: "VERIFIED",
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
        _sum: { amount: true },
      }),
      prisma.feePayment.count({ where: { ...where, status: "PENDING" } }),
      prisma.feePayment.count({ where: { ...where, status: "VERIFIED" } }),
      prisma.feePayment.count({ where: { ...where, status: "REJECTED" } }),
      prisma.student.count({
        where: { schoolId: req.schoolId, isActive: true },
      }),

      // Count distinct students who are debtors
      // A debtor is a student whose latest payment for a term still has isDebtor = true
      prisma.feePayment.findMany({
        where: { ...where, status: "VERIFIED", isDebtor: true },
        select: { studentId: true },
        distinct: ["studentId"],
      }),
    ]);

    // Students who have made at least one verified payment
    const studentsWithPayment = await prisma.feePayment.findMany({
      where: { ...where, status: "VERIFIED" },
      select: { studentId: true },
      distinct: ["studentId"],
    });

    // Total outstanding balance across all debtors
    const outstandingBalance = await prisma.feePayment.aggregate({
      where: { ...where, status: "VERIFIED", isDebtor: true },
      _sum: { balance: true },
    });

    return res.status(200).json({
      success: true,
      data: {
        totalCollected: totalCollected._sum.amount || 0,
        todayCollected: todayCollected._sum.amount || 0,
        pendingCount,
        verifiedCount,
        rejectedCount,
        totalStudents,
        paidStudents: studentsWithPayment.length,
        unpaidStudents: totalStudents - studentsWithPayment.length,
        debtorCount: debtorStudents.length,
        outstandingBalance: outstandingBalance._sum.balance || 0,
      },
    });
  } catch (error) {
    console.error("Get payment summary error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to get summary" });
  }
};

module.exports = {
  recordCashPayment,
  submitPayment,
  verifyPayment,
  rejectPayment,
  getPayments,
  getPendingPayments,
  getMyChildPayments,
  getPaymentSummary,
};
