const prisma = require("../config/db");

const computeGross = (r) =>
  Number(r.basicSalary) +
  Number(r.housingAllowance) +
  Number(r.transportAllowance) +
  Number(r.otherAllowances);

const computeDeductions = (r) =>
  Number(r.payeTax) +
  Number(r.pensionDeduction) +
  Number(r.otherDeductions) +
  Number(r.extraDeduction || 0);

const computeNet = (r) =>
  computeGross(r) + Number(r.bonus || 0) - computeDeductions(r);

// ==================== GENERATE MONTHLY PAYROLL ====================
// POST /api/payroll/generate
// Body: { month: "2026-10" }
const generatePayroll = async (req, res) => {
  try {
    const { month } = req.body;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        success: false,
        message: "Month is required in YYYY-MM format (e.g. 2026-10)",
      });
    }

    const year = parseInt(month.split("-")[0], 10);

    // Only active employees get a payroll record
    const employees = await prisma.employee.findMany({
      where: { schoolId: req.schoolId, status: "ACTIVE" },
    });

    if (employees.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No active employees to generate payroll for",
      });
    }

    const created = [];
    const skipped = [];

    for (const emp of employees) {
      // Check if already generated
      const exists = await prisma.payrollRecord.findUnique({
        where: { employeeId_month: { employeeId: emp.id, month } },
      });

      if (exists) {
        skipped.push({
          employeeId: emp.id,
          name: emp.fullName,
          reason: "Already exists",
        });
        continue;
      }

      const gross = computeGross(emp);
      const totalDeductions = computeDeductions(emp);
      const net = gross - totalDeductions;

      const record = await prisma.payrollRecord.create({
        data: {
          schoolId: req.schoolId,
          employeeId: emp.id,
          month,
          year,
          basicSalary: emp.basicSalary,
          housingAllowance: emp.housingAllowance,
          transportAllowance: emp.transportAllowance,
          otherAllowances: emp.otherAllowances,
          payeTax: emp.payeTax,
          pensionDeduction: emp.pensionDeduction,
          otherDeductions: emp.otherDeductions,
          bonus: 0,
          extraDeduction: 0,
          grossSalary: gross,
          totalDeductions,
          netSalary: net,
          status: "PENDING",
        },
      });
      created.push(record);
    }

    await prisma.auditLog.create({
      data: {
        schoolId: req.schoolId,
        staffId: req.staff.id,
        action: "PAYROLL_GENERATED",
        entity: "PayrollRecord",
        changes: { month, created: created.length, skipped: skipped.length },
      },
    });

    return res.json({
      success: true,
      message: `Generated ${created.length} payroll record(s) for ${month}`,
      data: {
        created: created.length,
        skipped: skipped.length,
        skippedList: skipped,
      },
    });
  } catch (err) {
    console.error("Generate payroll error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to generate payroll" });
  }
};

// ==================== LIST PAYROLL FOR A MONTH ====================
// GET /api/payroll?month=2026-10
const listPayroll = async (req, res) => {
  try {
    const { month } = req.query;
    const where = { schoolId: req.schoolId };
    if (month) where.month = month;

    const records = await prisma.payrollRecord.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            jobTitle: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: [{ month: "desc" }, { employee: { fullName: "asc" } }],
    });

    const totals = records.reduce(
      (acc, r) => {
        acc.gross += Number(r.grossSalary);
        acc.deductions += Number(r.totalDeductions);
        acc.bonus += Number(r.bonus);
        acc.net += Number(r.netSalary);
        if (r.status === "PAID") acc.paid += 1;
        else acc.pending += 1;
        return acc;
      },
      { gross: 0, deductions: 0, bonus: 0, net: 0, paid: 0, pending: 0 },
    );

    return res.json({
      success: true,
      data: records,
      summary: { ...totals, count: records.length },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to load payroll" });
  }
};

// ==================== UPDATE A PAYROLL RECORD ====================
// PUT /api/payroll/:id
// Body: { bonus, bonusReason, extraDeduction, extraDeductionReason, status }
const updatePayrollRecord = async (req, res) => {
  try {
    const existing = await prisma.payrollRecord.findFirst({
      where: { id: req.params.id, schoolId: req.schoolId },
    });
    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Payroll record not found" });
    }

    const b = req.body;
    const bonus =
      b.bonus !== undefined ? Number(b.bonus) : Number(existing.bonus);
    const extraDeduction =
      b.extraDeduction !== undefined
        ? Number(b.extraDeduction)
        : Number(existing.extraDeduction);

    // Recompute totals
    const gross = Number(existing.grossSalary); // snapshot — never changes
    const totalDeductions =
      Number(existing.payeTax) +
      Number(existing.pensionDeduction) +
      Number(existing.otherDeductions) +
      extraDeduction;
    const net = gross + bonus - totalDeductions;

    const data = {
      bonus,
      extraDeduction,
      bonusReason: b.bonusReason ?? existing.bonusReason,
      extraDeductionReason:
        b.extraDeductionReason ?? existing.extraDeductionReason,
      totalDeductions,
      netSalary: net,
    };

    if (b.status !== undefined) {
      data.status = b.status;
      if (b.status === "PAID" && !existing.paidAt) data.paidAt = new Date();
      if (b.status === "PENDING") data.paidAt = null;
    }

    const updated = await prisma.payrollRecord.update({
      where: { id: existing.id },
      data,
      include: { employee: { select: { fullName: true } } },
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Update payroll error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update payroll" });
  }
};

// ==================== DELETE PAYROLL RECORD ====================
// DELETE /api/payroll/:id
const deletePayrollRecord = async (req, res) => {
  try {
    const existing = await prisma.payrollRecord.findFirst({
      where: { id: req.params.id, schoolId: req.schoolId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    if (existing.status === "PAID") {
      return res
        .status(400)
        .json({ success: false, message: "Cannot delete a paid record" });
    }
    await prisma.payrollRecord.delete({ where: { id: existing.id } });
    return res.json({ success: true, message: "Deleted" });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete" });
  }
};

// ==================== YEARLY SUMMARY ====================
// GET /api/payroll/summary?year=2026
const getYearlySummary = async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const records = await prisma.payrollRecord.findMany({
      where: { schoolId: req.schoolId, year },
      select: {
        month: true,
        grossSalary: true,
        netSalary: true,
        totalDeductions: true,
        bonus: true,
        status: true,
      },
    });

    const byMonth = {};
    for (const r of records) {
      if (!byMonth[r.month]) {
        byMonth[r.month] = {
          month: r.month,
          gross: 0,
          net: 0,
          deductions: 0,
          bonus: 0,
          count: 0,
          paidCount: 0,
        };
      }
      byMonth[r.month].gross += Number(r.grossSalary);
      byMonth[r.month].net += Number(r.netSalary);
      byMonth[r.month].deductions += Number(r.totalDeductions);
      byMonth[r.month].bonus += Number(r.bonus);
      byMonth[r.month].count += 1;
      if (r.status === "PAID") byMonth[r.month].paidCount += 1;
    }

    const months = Object.values(byMonth).sort((a, b) =>
      a.month.localeCompare(b.month),
    );
    return res.json({ success: true, data: { year, months } });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to load summary" });
  }
};

module.exports = {
  generatePayroll,
  listPayroll,
  updatePayrollRecord,
  deletePayrollRecord,
  getYearlySummary,
};
