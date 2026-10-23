// @ts-nocheck
const prisma = require("../config/db");

//  1. EXISTING FEE REPORT
const getFeesReport = async (req, res) => {
  try {
    const { term, classId, academicYear } = req.query;
    const year = academicYear || new Date().getFullYear().toString();

    const studentWhere = { schoolId: req.schoolId, isActive: true };
    if (classId) studentWhere.classId = classId;

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
        },
      },
      orderBy: [{ class: { level: "asc" } }, { fullName: "asc" }],
    });

    const feeStructures = await prisma.feeStructure.findMany({
      where: {
        schoolId: req.schoolId,
        academicYear: year,
        isActive: true,
        ...(classId && { classId }),
        ...(term && { term }),
      },
    });

    const rows = students.map((student) => {
      const termPayments = student.payments;
      const totalPaid = termPayments.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );
      const totalPlatformFee = termPayments.reduce(
        (sum, p) => sum + Number(p.platformFee || 0),
        0,
      );
      const totalNetPaid = termPayments.reduce(
        (sum, p) => sum + Number(p.netAmount || p.amount),
        0,
      );
      const latestPayment = termPayments[0] || null;

      const feeStructure = feeStructures.find(
        (fs) => fs.classId === student.classId && (!term || fs.term === term),
      );
      const requiredAmount = latestPayment?.requiredAmount
        ? Number(latestPayment.requiredAmount)
        : feeStructure?.totalAmount
          ? Number(feeStructure.totalAmount)
          : null;
      const balance =
        requiredAmount !== null
          ? Math.max(0, requiredAmount - totalPaid)
          : null;

      const isDebtor = balance !== null && balance > 0;
      const isPaidFull = balance !== null && balance === 0 && totalPaid > 0;
      const isPartial = totalPaid > 0 && isDebtor;
      const hasCredit = Number(student.creditBalance) > 0;
      const noPayment = totalPaid === 0;

      let paymentStatus = "NO_PAYMENT";
      if (hasCredit && isPaidFull) paymentStatus = "PAID_WITH_CREDIT";
      else if (isPaidFull) paymentStatus = "PAID_FULL";
      else if (isPartial) paymentStatus = "PARTIAL";
      else if (noPayment) paymentStatus = "NO_PAYMENT";

      return {
        studentId: student.id,
        studentCode: student.studentCode,
        firstName: student.firstName,
        middleName: student.middleName,
        lastName: student.lastName,
        fullName: student.fullName,
        gender: student.gender,
        className: student.class.name,
        classLevel: student.class.level,
        parentName: student.parentName,
        parentPhone: student.parentPhone,
        academicYear: year,
        requiredAmount,
        totalPaid,
        platformFee: totalPlatformFee,
        netAmount: totalNetPaid,
        balance,
        isDebtor,
        isPaidFull,
        isPartial,
        noPayment,
        hasCredit,
        creditBalance: Number(student.creditBalance),
        paymentStatus,
        paymentCount: termPayments.length,
        lastPaymentDate: latestPayment?.createdAt || null,
      };
    });

    const summary = {
      totalStudents: rows.length,
      paidFull: rows.filter((r) => r.isPaidFull).length,
      partial: rows.filter((r) => r.isPartial).length,
      noPayment: rows.filter((r) => r.noPayment).length,
      debtors: rows.filter((r) => r.isDebtor).length,
      hasCredit: rows.filter((r) => r.hasCredit).length,
      totalCollected: rows.reduce((sum, r) => sum + r.totalPaid, 0),
      totalFees: rows.reduce((sum, r) => sum + r.platformFee, 0),
      totalNetCollected: rows.reduce((sum, r) => sum + r.netAmount, 0),
      totalOutstanding: rows.reduce((sum, r) => sum + (r.balance || 0), 0),
      totalRequired: rows.reduce((sum, r) => sum + (r.requiredAmount || 0), 0),
    };

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
          totalFees: 0,
          totalNetCollected: 0,
          totalOutstanding: 0,
        };
      }
      byClass[row.className].totalStudents++;
      if (row.isPaidFull) byClass[row.className].paidFull++;
      if (row.isPartial) byClass[row.className].partial++;
      if (row.noPayment) byClass[row.className].noPayment++;
      if (row.isDebtor) byClass[row.className].debtors++;
      byClass[row.className].totalCollected += row.totalPaid;
      byClass[row.className].totalFees += row.platformFee;
      byClass[row.className].totalNetCollected += row.netAmount;
      byClass[row.className].totalOutstanding += row.balance || 0;
    }

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
    return res
      .status(500)
      .json({ success: false, message: "Failed to generate report" });
  }
};

//  2. DEBTOR AGEING REPORT
const getDebtorAgeingReport = async (req, res) => {
  try {
    const { academicYear } = req.query;
    const year = academicYear || new Date().getFullYear().toString();

    const students = await prisma.student.findMany({
      where: { schoolId: req.schoolId, isActive: true },
      include: {
        class: { select: { name: true } },
        payments: { where: { status: "VERIFIED", academicYear: year } },
      },
      orderBy: { fullName: "asc" },
    });

    const feeStructures = await prisma.feeStructure.findMany({
      where: { schoolId: req.schoolId, academicYear: year, isActive: true },
    });

    const rows = [];
    let totalOwed = 0;

    for (const student of students) {
      const classFees = feeStructures.filter(
        (fs) => fs.classId === student.classId,
      );
      if (classFees.length === 0) continue;

      const termBalances = {};
      let studentTotalOwed = 0;

      for (const fee of classFees) {
        const termPayments = student.payments.filter(
          (p) => p.term === fee.term,
        );
        const paid = termPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        const req = Number(fee.totalAmount);
        const balance = Math.max(0, req - paid);

        if (balance > 0) {
          termBalances[fee.term] = balance;
          studentTotalOwed += balance;
        }
      }

      if (studentTotalOwed > 0) {
        rows.push({
          studentId: student.id,
          studentCode: student.studentCode,
          fullName: student.fullName,
          className: student.class.name,
          parentName: student.parentName,
          parentPhone: student.parentPhone,
          term1: termBalances["TERM_1"] || 0,
          term2: termBalances["TERM_2"] || 0,
          term3: termBalances["TERM_3"] || 0,
          totalOwed: studentTotalOwed,
        });
        totalOwed += studentTotalOwed;
      }
    }

    // Sort by highest owed
    rows.sort((a, b) => b.totalOwed - a.totalOwed);

    return res.status(200).json({
      success: true,
      data: {
        filters: { academicYear: year },
        summary: { totalDebtors: rows.length, totalOwed },
        rows,
      },
    });
  } catch (error) {
    console.error("Get ageing report error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to generate ageing report" });
  }
};

//  3. DAILY COLLECTION REPORT
const getDailyCollectionReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res
        .status(400)
        .json({ success: false, message: "Start and end dates are required" });
    }

    const startDate = new Date(from);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(to);
    endDate.setHours(23, 59, 59, 999);

    const payments = await prisma.feePayment.findMany({
      where: {
        schoolId: req.schoolId,
        status: "VERIFIED",
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        amount: true,
        paymentMethod: true,
        createdAt: true,
        platformFee: true,
        netAmount: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const dailyMap = {};

    for (const p of payments) {
      const dateStr = p.createdAt.toISOString().split("T")[0];
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = {
          date: dateStr,
          cash: 0,
          bank: 0,
          mobile: 0,
          total: 0,
          fees: 0,
          net: 0,
          count: 0,
        };
      }

      const amt = Number(p.amount);
      dailyMap[dateStr].total += amt;
      dailyMap[dateStr].fees += Number(p.platformFee || 0);
      dailyMap[dateStr].net += Number(p.netAmount || amt);
      dailyMap[dateStr].count++;

      if (p.paymentMethod === "CASH") {
        dailyMap[dateStr].cash += amt;
      } else if (["AIRTEL_MONEY", "TNM_MPAMBA"].includes(p.paymentMethod)) {
        dailyMap[dateStr].mobile += amt;
      } else {
        dailyMap[dateStr].bank += amt;
      }
    }

    const rows = Object.values(dailyMap).sort(
      (a, b) => new Date(b.date) - new Date(a.date),
    );
    const totals = rows.reduce(
      (acc, r) => ({
        cash: acc.cash + r.cash,
        bank: acc.bank + r.bank,
        mobile: acc.mobile + r.mobile,
        total: acc.total + r.total,
        fees: acc.fees + r.fees,
        net: acc.net + r.net,
        count: acc.count + r.count,
      }),
      { cash: 0, bank: 0, mobile: 0, total: 0, fees: 0, net: 0, count: 0 },
    );

    return res.status(200).json({
      success: true,
      data: { filters: { from, to }, totals, rows },
    });
  } catch (error) {
    console.error("Get daily collection error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to generate daily report" });
  }
};

// ==================== 4. FINANCIAL STATEMENT (YEAR-TO-DATE) ====================
const getFinancialStatement = async (req, res) => {
  try {
    const { academicYear } = req.query;
    const year = academicYear || new Date().getFullYear().toString();

    // 1. Fetch all verified payments for the year
    const payments = await prisma.feePayment.findMany({
      where: { schoolId: req.schoolId, status: "VERIFIED", academicYear: year },
    });

    // 2. Fetch all expected fees (Fee Structures) for active classes
    const students = await prisma.student.findMany({
      where: { schoolId: req.schoolId, isActive: true },
      select: { classId: true },
    });
    const activeClassIds = [...new Set(students.map((s) => s.classId))];

    const feeStructures = await prisma.feeStructure.findMany({
      where: {
        schoolId: req.schoolId,
        academicYear: year,
        isActive: true,
        classId: { in: activeClassIds },
      },
    });

    // Calculate expected revenue (theoretical maximum)
    let totalExpected = 0;
    const studentCountPerClass = {};
    students.forEach((s) => {
      studentCountPerClass[s.classId] =
        (studentCountPerClass[s.classId] || 0) + 1;
    });

    feeStructures.forEach((fs) => {
      const count = studentCountPerClass[fs.classId] || 0;
      totalExpected += Number(fs.totalAmount) * count;
    });

    // Calculate actual revenue
    const grossCollected = payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const platformFees = payments.reduce(
      (sum, p) => sum + Number(p.platformFee || 0),
      0,
    );
    const netCollected = payments.reduce(
      (sum, p) => sum + Number(p.netAmount || p.amount),
      0,
    );
    const outstanding = Math.max(0, totalExpected - grossCollected);

    // Breakdown by Term
    const termBreakdown = { TERM_1: 0, TERM_2: 0, TERM_3: 0 };
    payments.forEach((p) => {
      if (termBreakdown[p.term] !== undefined)
        termBreakdown[p.term] += Number(p.amount);
    });

    return res.status(200).json({
      success: true,
      data: {
        academicYear: year,
        statement: {
          totalExpected,
          grossCollected,
          platformFees,
          netCollected,
          outstanding,
          collectionRate:
            totalExpected > 0
              ? Math.round((grossCollected / totalExpected) * 100)
              : 0,
        },
        termBreakdown,
      },
    });
  } catch (error) {
    console.error("Get financial statement error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to generate statement" });
  }
};

module.exports = {
  getFeesReport,
  getDebtorAgeingReport,
  getDailyCollectionReport,
  getFinancialStatement,
};
