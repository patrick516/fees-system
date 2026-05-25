const prisma = require("../config/db");
const { generateReceiptNumber } = require("../lib/utils");

// ==================== RECORD CASH PAYMENT (Bursar) ====================
// POST /api/payments/cash
const recordCashPayment = async (req, res) => {
  try {
    const { studentId, amount, term, academicYear, notes } = req.body;

    if (!studentId || !amount || !term) {
      return res.status(400).json({
        success: false,
        message: "studentId, amount and term are required",
      });
    }

    // Verify student belongs to this school
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: req.schoolId },
      include: { class: true, school: true },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Generate receipt number
    const year = academicYear || new Date().getFullYear().toString();
    const paymentCount = await prisma.feePayment.count({
      where: { schoolId: req.schoolId },
    });
    const receiptNumber = generateReceiptNumber(year, paymentCount + 1);

    // Create payment - auto verified since bursar recorded it in person
    const payment = await prisma.feePayment.create({
      data: {
        schoolId: req.schoolId,
        studentId,
        amount: parseFloat(amount),
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

    // Audit log
    await prisma.auditLog.create({
      data: {
        schoolId: req.schoolId,
        staffId: req.staff.id,
        action: "PAYMENT_RECORDED",
        entity: "FeePayment",
        entityId: payment.id,
        changes: { amount, term, studentId, receiptNumber },
      },
    });

    // TODO: Send SMS to parent after Africa's Talking is set up
    // For now log it
    console.log(
      `📱 SMS to ${payment.student.parentPhone}: Payment of MWK ${amount} received for ${payment.student.fullName}. Receipt: ${receiptNumber}`,
    );

    return res.status(201).json({
      success: true,
      message: "Payment recorded successfully",
      data: payment,
    });
  } catch (error) {
    console.error("Record cash payment error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to record payment",
    });
  }
};

// ==================== PARENT SUBMITS PAYMENT WITH RECEIPT ====================
// POST /api/payments/submit
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

    // Verify student matches logged in parent
    if (req.student.id !== studentId) {
      return res.status(403).json({
        success: false,
        message: "You can only submit payments for your own child",
      });
    }

    const year = academicYear || new Date().getFullYear().toString();
    const paymentCount = await prisma.feePayment.count({
      where: { schoolId: req.student.schoolId },
    });
    const receiptNumber = generateReceiptNumber(year, paymentCount + 1);

    // Check if receipt image was uploaded
    const receiptImage = req.file ? req.file.path : null;

    if (!receiptImage && paymentMethod !== "CASH") {
      return res.status(400).json({
        success: false,
        message: "Please upload your payment receipt",
      });
    }

    const payment = await prisma.feePayment.create({
      data: {
        schoolId: req.student.schoolId,
        studentId,
        amount: parseFloat(amount),
        paymentMethod,
        term,
        academicYear: year,
        receiptNumber,
        receiptImage,
        bankReference: bankReference || null,
        submittedBy: "PARENT",
        status: "PENDING",
        parentPhone: req.parentPhone,
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
            class: { select: { name: true } },
          },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
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
            class: { select: { name: true } },
          },
        },
        verifiedBy: { select: { fullName: true } },
      },
    });

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
      `📱 SMS to ${payment.student.parentPhone}: Payment of MWK ${payment.amount} for ${payment.student.fullName} has been CONFIRMED. Receipt: ${payment.receiptNumber}`,
    );

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      data: verified,
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
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
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
        student: {
          select: {
            fullName: true,
            parentPhone: true,
          },
        },
      },
    });

    console.log(
      `📱 SMS to ${rejected.student.parentPhone}: Your payment submission for ${rejected.student.fullName} was rejected. Reason: ${reason}. Please resubmit.`,
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
      page = 1,
      limit = 20,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { schoolId: req.schoolId };
    if (status) where.status = status;
    if (term) where.term = term;
    if (academicYear) where.academicYear = academicYear;
    if (studentId) where.studentId = studentId;

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
    return res.status(500).json({
      success: false,
      message: "Failed to get payments",
    });
  }
};

// ==================== GET PENDING PAYMENTS ====================
// GET /api/payments/pending
const getPendingPayments = async (req, res) => {
  try {
    const payments = await prisma.feePayment.findMany({
      where: {
        schoolId: req.schoolId,
        status: "PENDING",
      },
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
    return res.status(500).json({
      success: false,
      message: "Failed to get pending payments",
    });
  }
};

// ==================== GET PARENT'S CHILD PAYMENTS ====================
// GET /api/payments/my-child
const getMyChildPayments = async (req, res) => {
  try {
    const payments = await prisma.feePayment.findMany({
      where: {
        studentId: req.student.id,
      },
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
        summary: {
          totalPaid,
          pendingAmount,
          totalPayments: payments.length,
        },
      },
    });
  } catch (error) {
    console.error("Get my child payments error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get payment history",
    });
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
    ] = await Promise.all([
      // Total verified amount
      prisma.feePayment.aggregate({
        where: { ...where, status: "VERIFIED" },
        _sum: { amount: true },
      }),
      // Today's collections
      prisma.feePayment.aggregate({
        where: {
          ...where,
          status: "VERIFIED",
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
        _sum: { amount: true },
      }),
      // Pending count
      prisma.feePayment.count({
        where: { ...where, status: "PENDING" },
      }),
      // Verified count
      prisma.feePayment.count({
        where: { ...where, status: "VERIFIED" },
      }),
      // Rejected count
      prisma.feePayment.count({
        where: { ...where, status: "REJECTED" },
      }),
    ]);

    // Students with zero payment
    const studentsWithPayment = await prisma.feePayment.findMany({
      where: { ...where, status: "VERIFIED" },
      select: { studentId: true },
      distinct: ["studentId"],
    });

    const totalStudents = await prisma.student.count({
      where: { schoolId: req.schoolId, isActive: true },
    });

    const paidStudentIds = studentsWithPayment.map((p) => p.studentId);

    return res.status(200).json({
      success: true,
      data: {
        totalCollected: totalCollected._sum.amount || 0,
        todayCollected: todayCollected._sum.amount || 0,
        pendingCount,
        verifiedCount,
        rejectedCount,
        totalStudents,
        paidStudents: paidStudentIds.length,
        unpaidStudents: totalStudents - paidStudentIds.length,
      },
    });
  } catch (error) {
    console.error("Get payment summary error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get summary",
    });
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
