const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  verifyStaff,
  verifyParent,
  verifyStaffOrParent,
} = require("../middleware/auth");
const { isAdmin, isBursar } = require("../middleware/role");
const prisma = require("../config/db");
const schoolController = require("../controllers/school.controller");

const upload = multer({ storage: multer.memoryStorage() });

// ==================== CLASSES ====================

// GET /api/schools/classes
router.get("/classes", verifyStaff, isBursar, async (req, res) => {
  try {
    const classes = await prisma.class.findMany({
      where: { schoolId: req.schoolId, isActive: true },
      include: {
        _count: { select: { students: true } },
        feeStructures: {
          where: { isActive: true },
          select: {
            id: true,
            term: true,
            academicYear: true,
            totalAmount: true,
          },
        },
      },
      orderBy: { level: "asc" },
    });
    res.json({ success: true, data: classes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to get classes" });
  }
});

// POST /api/schools/classes
router.post("/classes", verifyStaff, isAdmin, async (req, res) => {
  try {
    const { name, level } = req.body;
    if (!name || !level) {
      return res.status(400).json({
        success: false,
        message: "Name and level are required",
      });
    }
    const cls = await prisma.class.create({
      data: { schoolId: req.schoolId, name, level: parseInt(level) },
    });
    res.status(201).json({ success: true, data: cls });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Class already exists",
      });
    }
    res.status(500).json({ success: false, message: "Failed to create class" });
  }
});

// DELETE /api/schools/classes/:id (soft delete)
router.delete("/classes/:id", verifyStaff, isAdmin, async (req, res) => {
  try {
    const cls = await prisma.class.findFirst({
      where: { id: req.params.id, schoolId: req.schoolId },
      include: { _count: { select: { students: true } } },
    });
    if (!cls) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });
    }
    if (cls._count.students > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete class with ${cls._count.students} students. Move students first.`,
      });
    }
    await prisma.class.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true, message: "Class deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete class" });
  }
});

// ==================== FEE STRUCTURES ====================

// GET /api/schools/fee-structures
router.get("/fee-structures", verifyStaff, isBursar, async (req, res) => {
  try {
    const { classId, term, academicYear } = req.query;

    const where = { schoolId: req.schoolId, isActive: true };
    if (classId) where.classId = classId;
    if (term) where.term = term;
    if (academicYear) where.academicYear = academicYear;

    const feeStructures = await prisma.feeStructure.findMany({
      where,
      include: {
        class: { select: { id: true, name: true, level: true } },
      },
      orderBy: [{ class: { level: "asc" } }, { term: "asc" }],
    });

    res.json({ success: true, data: feeStructures });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to get fee structures" });
  }
});

// GET /api/schools/fee-structures/lookup
router.get(
  "/fee-structures/lookup",
  verifyStaff,
  isBursar,
  async (req, res) => {
    try {
      const { classId, term, academicYear } = req.query;

      if (!classId || !term || !academicYear) {
        return res.status(400).json({
          success: false,
          message: "classId, term and academicYear are required",
        });
      }

      const feeStructure = await prisma.feeStructure.findFirst({
        where: {
          schoolId: req.schoolId,
          classId,
          term,
          academicYear,
          isActive: true,
        },
        include: {
          class: { select: { name: true } },
        },
      });

      if (!feeStructure) {
        return res.status(404).json({
          success: false,
          message:
            "No fee structure set for this class and term. Please set fees first.",
        });
      }

      res.json({ success: true, data: feeStructure });
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ success: false, message: "Failed to lookup fee structure" });
    }
  },
);

// POST /api/schools/fee-structures
router.post("/fee-structures", verifyStaff, isAdmin, async (req, res) => {
  try {
    const {
      classId,
      academicYear,
      term,
      totalAmount,
      tuitionFee,
      examFee,
      buildingLevy,
      uniformFee,
      bookFee,
      otherFees,
      otherFeesDescription,
    } = req.body;

    if (!classId || !academicYear || !term || !totalAmount) {
      return res.status(400).json({
        success: false,
        message: "classId, academicYear, term and totalAmount are required",
      });
    }

    const cls = await prisma.class.findFirst({
      where: { id: classId, schoolId: req.schoolId },
    });
    if (!cls) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    const feeStructure = await prisma.feeStructure.upsert({
      where: {
        schoolId_classId_academicYear_term: {
          schoolId: req.schoolId,
          classId,
          academicYear,
          term,
        },
      },
      update: {
        totalAmount: parseFloat(totalAmount),
        tuitionFee: tuitionFee ? parseFloat(tuitionFee) : null,
        examFee: examFee ? parseFloat(examFee) : null,
        buildingLevy: buildingLevy ? parseFloat(buildingLevy) : null,
        uniformFee: uniformFee ? parseFloat(uniformFee) : null,
        bookFee: bookFee ? parseFloat(bookFee) : null,
        otherFees: otherFees ? parseFloat(otherFees) : null,
        otherFeesDescription: otherFeesDescription || null,
        isActive: true,
      },
      create: {
        schoolId: req.schoolId,
        classId,
        academicYear,
        term,
        totalAmount: parseFloat(totalAmount),
        tuitionFee: tuitionFee ? parseFloat(tuitionFee) : null,
        examFee: examFee ? parseFloat(examFee) : null,
        buildingLevy: buildingLevy ? parseFloat(buildingLevy) : null,
        uniformFee: uniformFee ? parseFloat(uniformFee) : null,
        bookFee: bookFee ? parseFloat(bookFee) : null,
        otherFees: otherFees ? parseFloat(otherFees) : null,
        otherFeesDescription: otherFeesDescription || null,
      },
      include: {
        class: { select: { name: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        schoolId: req.schoolId,
        staffId: req.staff.id,
        action: "FEE_STRUCTURE_SET",
        entity: "FeeStructure",
        entityId: feeStructure.id,
        changes: { classId, term, academicYear, totalAmount },
      },
    });

    res.status(201).json({
      success: true,
      message: `Fees set for ${feeStructure.class.name} - ${term.replace("_", " ")} ${academicYear}`,
      data: feeStructure,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to set fee structure" });
  }
});

// PUT /api/schools/fee-structures/:id
router.put("/fee-structures/:id", verifyStaff, isAdmin, async (req, res) => {
  try {
    const existing = await prisma.feeStructure.findFirst({
      where: { id: req.params.id, schoolId: req.schoolId },
    });
    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Fee structure not found" });
    }

    const updated = await prisma.feeStructure.update({
      where: { id: req.params.id },
      data: {
        totalAmount: req.body.totalAmount
          ? parseFloat(req.body.totalAmount)
          : existing.totalAmount,
        tuitionFee: req.body.tuitionFee
          ? parseFloat(req.body.tuitionFee)
          : existing.tuitionFee,
        examFee: req.body.examFee
          ? parseFloat(req.body.examFee)
          : existing.examFee,
        buildingLevy: req.body.buildingLevy
          ? parseFloat(req.body.buildingLevy)
          : existing.buildingLevy,
        uniformFee: req.body.uniformFee
          ? parseFloat(req.body.uniformFee)
          : existing.uniformFee,
        bookFee: req.body.bookFee
          ? parseFloat(req.body.bookFee)
          : existing.bookFee,
        otherFees: req.body.otherFees
          ? parseFloat(req.body.otherFees)
          : existing.otherFees,
        otherFeesDescription:
          req.body.otherFeesDescription || existing.otherFeesDescription,
      },
      include: { class: { select: { name: true } } },
    });

    res.json({
      success: true,
      message: "Fee structure updated",
      data: updated,
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to update fee structure" });
  }
});

// DELETE /api/schools/fee-structures/:id
router.delete("/fee-structures/:id", verifyStaff, isAdmin, async (req, res) => {
  try {
    const existing = await prisma.feeStructure.findFirst({
      where: { id: req.params.id, schoolId: req.schoolId },
    });
    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Fee structure not found" });
    }
    await prisma.feeStructure.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true, message: "Fee structure removed" });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to delete fee structure" });
  }
});

// ==================== ACTIVE TERM ====================

// GET /api/schools/active-term
router.get("/active-term", verifyStaffOrParent, async (req, res) => {
  try {
    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: {
        activeTerm: true,
        activeAcademicYear: true,
        activeTermStartDate: true,
        activeTermEndDate: true,
      },
    });

    if (!school.activeTerm) {
      return res.status(404).json({
        success: false,
        message: "No active term set. Please activate a term first.",
      });
    }

    res.json({
      success: true,
      data: {
        activeTerm: school.activeTerm,
        activeAcademicYear: school.activeAcademicYear,
        activeTermStartDate: school.activeTermStartDate,
        activeTermEndDate: school.activeTermEndDate,
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to get active term" });
  }
});

// GET /api/schools/term-history
// Every term the school has run, with a financial summary per term.
router.get("/term-history", verifyStaff, async (req, res) => {
  try {
    const activations = await prisma.termActivation.findMany({
      where: { schoolId: req.schoolId },
      orderBy: [{ academicYear: "desc" }, { term: "desc" }],
    });

    if (activations.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const students = await prisma.student.findMany({
      where: { schoolId: req.schoolId, isActive: true },
      include: {
        class: {
          include: {
            feeStructures: { where: { isActive: true } },
          },
        },
      },
    });

    const paymentGroups = await prisma.feePayment.groupBy({
      by: ["studentId", "term", "academicYear"],
      where: { schoolId: req.schoolId, status: "VERIFIED" },
      _sum: { amount: true },
    });

    const paidMap = new Map();
    for (const p of paymentGroups) {
      paidMap.set(
        `${p.studentId}|${p.term}|${p.academicYear}`,
        p._sum.amount || 0,
      );
    }

    const history = activations.map((a) => {
      let totalRequired = 0;
      let totalCollected = 0;
      let debtors = 0;
      let paidFull = 0;

      for (const s of students) {
        const fee =
          s.class.feeStructures.find(
            (fs) => fs.term === a.term && fs.academicYear === a.academicYear,
          )?.totalAmount || 0;
        if (fee === 0) continue;

        const paid = paidMap.get(`${s.id}|${a.term}|${a.academicYear}`) || 0;
        totalRequired += fee;
        totalCollected += Math.min(paid, fee);

        if (paid >= fee) paidFull++;
        else debtors++;
      }

      return {
        id: a.id,
        term: a.term,
        academicYear: a.academicYear,
        startDate: a.startDate,
        endDate: a.endDate,
        activatedAt: a.activatedAt,
        totalRequired,
        totalCollected,
        outstanding: Math.max(0, totalRequired - totalCollected),
        debtors,
        paidFull,
      };
    });

    res.json({ success: true, data: history });
  } catch (err) {
    console.error("Get term history error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to get term history" });
  }
});

// POST /api/schools/activate-term
router.post("/activate-term", verifyStaff, isAdmin, async (req, res) => {
  try {
    const { term, academicYear, startDate, endDate } = req.body;

    if (!term || !academicYear) {
      return res.status(400).json({
        success: false,
        message: "term and academicYear are required",
      });
    }

    let parsedStart = null;
    let parsedEnd = null;
    if (startDate) parsedStart = new Date(startDate);
    if (endDate) parsedEnd = new Date(endDate);

    if (parsedStart && parsedEnd && parsedEnd < parsedStart) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date",
      });
    }

    // Snapshot the previous active term before switching
    const currentSchool = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: {
        activeTerm: true,
        activeAcademicYear: true,
        activeTermStartDate: true,
        activeTermEndDate: true,
      },
    });

    if (currentSchool?.activeTerm && currentSchool.activeAcademicYear) {
      const isSameTerm =
        currentSchool.activeTerm === term &&
        currentSchool.activeAcademicYear === academicYear;

      if (!isSameTerm) {
        await prisma.termActivation.upsert({
          where: {
            schoolId_term_academicYear: {
              schoolId: req.schoolId,
              term: currentSchool.activeTerm,
              academicYear: currentSchool.activeAcademicYear,
            },
          },
          update: {
            startDate: currentSchool.activeTermStartDate,
            endDate: currentSchool.activeTermEndDate,
          },
          create: {
            schoolId: req.schoolId,
            term: currentSchool.activeTerm,
            academicYear: currentSchool.activeAcademicYear,
            startDate: currentSchool.activeTermStartDate,
            endDate: currentSchool.activeTermEndDate,
            activatedById: req.staff.id,
          },
        });
      }
    }

    // Require at least one fee structure
    const feeStructuresExist = await prisma.feeStructure.count({
      where: {
        schoolId: req.schoolId,
        term,
        academicYear,
        isActive: true,
      },
    });

    if (feeStructuresExist === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Please set fee structures for at least one class before activating this term.",
      });
    }

    // Apply credits
    const studentsWithCredit = await prisma.student.findMany({
      where: {
        schoolId: req.schoolId,
        creditBalance: { gt: 0 },
        isActive: true,
      },
      include: { class: true },
    });

    let creditsApplied = 0;

    for (const student of studentsWithCredit) {
      const feeStructure = await prisma.feeStructure.findFirst({
        where: {
          schoolId: req.schoolId,
          classId: student.classId,
          term,
          academicYear,
          isActive: true,
        },
      });

      if (!feeStructure || student.creditBalance <= 0) continue;

      const creditToApply = Math.min(
        student.creditBalance,
        feeStructure.totalAmount,
      );

      const paymentCount = await prisma.feePayment.count({
        where: { schoolId: req.schoolId },
      });

      const { generateReceiptNumber } = require("../lib/utils");
      const receiptNumber = generateReceiptNumber(
        academicYear,
        paymentCount + 1,
      );

      await prisma.feePayment.create({
        data: {
          schoolId: req.schoolId,
          studentId: student.id,
          amount: creditToApply,
          paymentMethod: "CASH",
          term,
          academicYear,
          receiptNumber,
          submittedBy: "BURSAR",
          status: "VERIFIED",
          notes: `Credit carried over from previous term`,
          requiredAmount: feeStructure.totalAmount,
          balance: feeStructure.totalAmount - creditToApply,
          isDebtor: feeStructure.totalAmount - creditToApply > 0,
          creditApplied: creditToApply,
          verifiedAt: new Date(),
        },
      });

      await prisma.student.update({
        where: { id: student.id },
        data: { creditBalance: student.creditBalance - creditToApply },
      });

      creditsApplied++;
    }

    // Activate the term on the school row
    await prisma.school.update({
      where: { id: req.schoolId },
      data: {
        activeTerm: term,
        activeAcademicYear: academicYear,
        activeTermStartDate: parsedStart,
        activeTermEndDate: parsedEnd,
      },
    });

    // Record the new term in the permanent history table
    await prisma.termActivation.upsert({
      where: {
        schoolId_term_academicYear: {
          schoolId: req.schoolId,
          term,
          academicYear,
        },
      },
      update: {
        startDate: parsedStart,
        endDate: parsedEnd,
        activatedAt: new Date(),
        activatedById: req.staff.id,
      },
      create: {
        schoolId: req.schoolId,
        term,
        academicYear,
        startDate: parsedStart,
        endDate: parsedEnd,
        activatedById: req.staff.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        schoolId: req.schoolId,
        staffId: req.staff.id,
        action: "TERM_ACTIVATED",
        entity: "School",
        entityId: req.schoolId,
        changes: { term, academicYear, creditsApplied },
      },
    });

    res.json({
      success: true,
      message: `${term.replace("_", " ")} ${academicYear} activated successfully. ${creditsApplied} student credit(s) applied automatically.`,
      data: { term, academicYear, creditsApplied },
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to activate term" });
  }
});

// ==================== STUDENT TERM STATUS ====================

router.get(
  "/student-term-status/:studentId",
  verifyStaffOrParent,
  async (req, res) => {
    try {
      const { studentId } = req.params;
      const { term, academicYear } = req.query;

      if (!term || !academicYear) {
        return res.status(400).json({
          success: false,
          message: "term and academicYear are required",
        });
      }
      const student = await prisma.student.findFirst({
        where: { id: studentId, schoolId: req.schoolId },
        include: { class: true },
      });

      if (!student) {
        return res
          .status(404)
          .json({ success: false, message: "Student not found" });
      }

      const feeStructure = await prisma.feeStructure.findFirst({
        where: {
          schoolId: req.schoolId,
          classId: student.classId,
          term,
          academicYear,
          isActive: true,
        },
      });

      const paymentsThisTerm = await prisma.feePayment.aggregate({
        where: {
          studentId,
          term,
          academicYear,
          status: "VERIFIED",
        },
        _sum: { amount: true },
      });

      const requiredAmount = feeStructure?.totalAmount || null;
      const totalPaidThisTerm = paymentsThisTerm._sum.amount || 0;
      const balanceRemaining =
        requiredAmount !== null
          ? Math.max(0, requiredAmount - totalPaidThisTerm)
          : null;
      const isFullyPaid = balanceRemaining === 0;
      const creditBalance = student.creditBalance;

      res.json({
        success: true,
        data: {
          student: {
            id: student.id,
            fullName: student.fullName,
            studentCode: student.studentCode,
            className: student.class.name,
            creditBalance,
          },
          feeStructure: feeStructure
            ? {
                totalAmount: feeStructure.totalAmount,
                tuitionFee: feeStructure.tuitionFee,
                examFee: feeStructure.examFee,
                buildingLevy: feeStructure.buildingLevy,
              }
            : null,
          termStatus: {
            requiredAmount,
            totalPaidThisTerm,
            balanceRemaining,
            isFullyPaid,
            creditBalance,
            hasFeeStructure: !!feeStructure,
          },
        },
      });
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ success: false, message: "Failed to get student term status" });
    }
  },
);

// ==================== PAYMENT DETAILS ====================

router.put("/payment-details", verifyStaff, isAdmin, async (req, res) => {
  try {
    const {
      bankAccounts,
      airtelMoneyNumber,
      mpambaNumber,
      paymentInstructions,
    } = req.body;

    if (bankAccounts && !Array.isArray(bankAccounts)) {
      return res.status(400).json({
        success: false,
        message: "bankAccounts must be an array",
      });
    }

    const updated = await prisma.school.update({
      where: { id: req.schoolId },
      data: {
        bankAccounts: bankAccounts || [],
        airtelMoneyNumber: airtelMoneyNumber || null,
        mpambaNumber: mpambaNumber || null,
        paymentInstructions: paymentInstructions || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        schoolId: req.schoolId,
        staffId: req.staff.id,
        action: "PAYMENT_DETAILS_UPDATED",
        entity: "School",
        entityId: req.schoolId,
        changes: { bankAccounts, airtelMoneyNumber, mpambaNumber },
      },
    });

    res.json({
      success: true,
      message: "Payment details updated successfully",
      data: updated,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to update payment details",
    });
  }
});

// GET /api/schools/payment-info/:schoolId — public
router.get("/payment-info/:schoolId", async (req, res) => {
  try {
    const school = await prisma.school.findUnique({
      where: { id: req.params.schoolId },
      select: {
        name: true,
        phone: true,
        bankAccounts: true,
        airtelMoneyNumber: true,
        mpambaNumber: true,
        paymentInstructions: true,
      },
    });

    if (!school) {
      return res.status(404).json({
        success: false,
        message: "School not found",
      });
    }

    res.json({ success: true, data: school });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to get payment info",
    });
  }
});

// ==================== SCHOOL INFO ====================

router.get("/me", verifyStaff, async (req, res) => {
  try {
    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
      include: {
        _count: {
          select: {
            students: true,
            staff: true,
            classes: true,
          },
        },
      },
    });
    res.json({ success: true, data: school });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to get school info" });
  }
});

// ==================== SETTINGS ====================

router.get("/settings", verifyStaff, schoolController.getSettings);
router.put("/settings", verifyStaff, isAdmin, schoolController.updateSettings);
router.post(
  "/settings/logo",
  verifyStaff,
  isAdmin,
  upload.single("logo"),
  schoolController.uploadLogo,
);
router.get("/public", schoolController.getPublicSchool);
router.get("/public/:schoolId", schoolController.getPublicInfo);
router.get("/lookup-by-email", schoolController.lookupByEmail);
router.get("/by-slug/:slug", schoolController.getBySlug);

module.exports = router;
