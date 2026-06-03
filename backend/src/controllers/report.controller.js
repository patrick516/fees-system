// @ts-nocheck
const prisma = require("../config/db");
const getFeesReport = async (req, res) => {
  try {
    const { term, classId, academicYear } = req.query;

    const year = academicYear || new Date().getFullYear().toString();

    // Build student filter
    const studentWhere = {
      schoolId: req.schoolId,
      isActive: true,
    };
    if (classId) studentWhere.classId = classId;

    // Get all students with their payments
    const students = await prisma.student.findMany({
      where: studentWhere,
      include: {
        class: { select: { id: true, name: true, level: true } },
        payments: {
          where: {
            status: "VERIFIED",
            academicYear: year,
            ...(term && { term }),
          },
          select: {
            amount: true,
            term: true,
            academicYear: true,
            balance: true,
            isDebtor: true,
            requiredAmount: true,
            overpayment: true,
            receiptNumber: true,
            paymentMethod: true,
            createdAt: true,
          },
        },
      },
      orderBy: [{ class: { level: "asc" } }, { fullName: "asc" }],
    });

    // Get fee structures for context
    const feeStructureWhere = {
      schoolId: req.schoolId,
      academicYear: year,
      isActive: true,
    };
    if (classId) feeStructureWhere.classId = classId;
    if (term) feeStructureWhere.term = term;

    const feeStructures = await prisma.feeStructure.findMany({
      where: feeStructureWhere,
      include: { class: { select: { name: true } } },
    });

    // Build report rows
    const rows = students.map((student) => {
      const termPayments = student.payments;
      const totalPaid = termPayments.reduce((sum, p) => sum + p.amount, 0);
      const latestPayment = termPayments[0] || null;

      // Find fee structure for this student's class
      const feeStructure = feeStructures.find(
        (fs) => fs.classId === student.classId && (!term || fs.term === term),
      );
      const requiredAmount =
        latestPayment?.requiredAmount || feeStructure?.totalAmount || null;
      const balance =
        requiredAmount !== null
          ? Math.max(0, requiredAmount - totalPaid)
          : null;
      const isDebtor = balance !== null && balance > 0;
      const isPaidFull = balance !== null && balance === 0 && totalPaid > 0;
      const isPartial = totalPaid > 0 && isDebtor;
      const hasCredit = student.creditBalance > 0;
      const noPayment = totalPaid === 0;

      let paymentStatus = "NO_PAYMENT";
      if (hasCredit && isPaidFull) paymentStatus = "PAID_WITH_CREDIT";
      else if (isPaidFull) paymentStatus = "PAID_FULL";
      else if (isPartial) paymentStatus = "PARTIAL";
      else if (noPayment) paymentStatus = "NO_PAYMENT";

      return {
        studentId: student.id,
        studentCode: student.studentCode,
        fullName: student.fullName,
        gender: student.gender,
        className: student.class.name,
        classLevel: student.class.level,
        parentName: student.parentName,
        parentPhone: student.parentPhone,
        academicYear: year,
        requiredAmount,
        totalPaid,
        balance,
        isDebtor,
        isPaidFull,
        isPartial,
        noPayment,
        hasCredit,
        creditBalance: student.creditBalance,
        paymentStatus,
        paymentCount: termPayments.length,
        lastPaymentDate: latestPayment?.createdAt || null,
      };
    });

    // Calculate summary
    const summary = {
      totalStudents: rows.length,
      paidFull: rows.filter((r) => r.isPaidFull).length,
      partial: rows.filter((r) => r.isPartial).length,
      noPayment: rows.filter((r) => r.noPayment).length,
      debtors: rows.filter((r) => r.isDebtor).length,
      hasCredit: rows.filter((r) => r.hasCredit).length,
      totalCollected: rows.reduce((sum, r) => sum + r.totalPaid, 0),
      totalOutstanding: rows.reduce((sum, r) => sum + (r.balance || 0), 0),
      totalRequired: rows.reduce((sum, r) => sum + (r.requiredAmount || 0), 0),
    };

    // Group by class for class summary - FIXED: removed TypeScript type annotations
    const byClass = {};
    for (const row of rows) {
      if (!byClass[row.className]) {
        byClass[row.className] = {
          className: row.className,
          classLevel: row.classLevel,
          totalStudents: 0,
          paidFull: 0,
          partial: 0,
          noPayment: 0,
          debtors: 0,
          totalCollected: 0,
          totalOutstanding: 0,
        };
      }
      byClass[row.className].totalStudents++;
      if (row.isPaidFull) byClass[row.className].paidFull++;
      if (row.isPartial) byClass[row.className].partial++;
      if (row.noPayment) byClass[row.className].noPayment++;
      if (row.isDebtor) byClass[row.className].debtors++;
      byClass[row.className].totalCollected += row.totalPaid;
      byClass[row.className].totalOutstanding += row.balance || 0;
    }

    // FIXED: removed TypeScript type annotations from sort parameters
    const classSummary = Object.values(byClass).sort(
      (a, b) => a.classLevel - b.classLevel,
    );

    return res.status(200).json({
      success: true,
      data: {
        filters: { term, classId, academicYear: year },
        summary,
        classSummary,
        rows,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Get fees report error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate report",
    });
  }
};

module.exports = { getFeesReport };
