const prisma = require("../config/db");

const buildFullName = (firstName, lastName) =>
  [firstName, lastName].filter(Boolean).join(" ").trim();

// 🎯 Compute PAYE amount based on type
const computePaye = (grossSalary, payeInput, payeType) => {
  const val = Number(payeInput) || 0;
  if (val <= 0) return 0;
  if (payeType === "PERCENT") {
    return Number(((Number(grossSalary) || 0) * val) / 100).toFixed(2);
  }
  return Number(val).toFixed(2); // FIXED
};

// ==================== LIST ====================
const listEmployees = async (req, res) => {
  try {
    const { search, status, departmentId } = req.query;
    const where = { schoolId: req.schoolId };

    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { jobTitle: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { nationalId: { contains: search, mode: "insensitive" } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        department: { select: { id: true, name: true } },
        _count: { select: { payrollRecords: true } },
      },
      orderBy: { fullName: "asc" },
    });

    const activeEmployees = employees.filter((e) => e.status === "ACTIVE");
    const monthlyTotal = activeEmployees.reduce((sum, e) => {
      const gross =
        Number(e.basicSalary) +
        Number(e.housingAllowance) +
        Number(e.transportAllowance) +
        Number(e.otherAllowances);
      const deductions =
        Number(e.payeTax) +
        Number(e.pensionDeduction) +
        Number(e.otherDeductions);
      return sum + (gross - deductions);
    }, 0);

    return res.json({
      success: true,
      data: employees,
      summary: {
        totalEmployees: employees.length,
        activeCount: activeEmployees.length,
        monthlyNetPayroll: monthlyTotal,
      },
    });
  } catch (err) {
    console.error("List employees error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load employees" });
  }
};

// ==================== GET ONE ====================
const getEmployee = async (req, res) => {
  try {
    const employee = await prisma.employee.findFirst({
      where: { id: req.params.id, schoolId: req.schoolId },
      include: {
        department: { select: { id: true, name: true } },
        payrollRecords: { orderBy: { month: "desc" }, take: 12 },
      },
    });
    if (!employee) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }
    return res.json({ success: true, data: employee });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to load employee" });
  }
};

// ==================== CREATE ====================
const createEmployee = async (req, res) => {
  try {
    const {
      honorific,
      firstName,
      lastName,
      gender,
      title,
      departmentId,
      phone,
      email,
      nationalId,
      dateOfBirth,
      hireDate,
      photo,
      basicSalary,
      housingAllowance,
      transportAllowance,
      otherAllowances,
      payePercent,
      payeType,
      payeTax,
      pensionDeduction,
      otherDeductions,
      status,
      notes,
    } = req.body;

    if (!firstName || !lastName) {
      return res
        .status(400)
        .json({ success: false, message: "First and last name are required" });
    }

    const grossForPaye =
      (Number(basicSalary) || 0) +
      (Number(housingAllowance) || 0) +
      (Number(transportAllowance) || 0) +
      (Number(otherAllowances) || 0);

    // 🎯 Calculate Final PAYE
    let finalPayeTax = 0;
    if (payePercent !== undefined) {
      finalPayeTax = computePaye(
        grossForPaye,
        payePercent,
        payeType || "PERCENT",
      );
    } else if (payeTax !== undefined) {
      finalPayeTax = Number(payeTax) || 0;
    }

    const employee = await prisma.employee.create({
      data: {
        schoolId: req.schoolId,
        honorific: honorific?.trim() || null,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName: buildFullName(firstName, lastName),
        gender: gender || null,
        jobTitle: title?.trim() || null,
        departmentId: departmentId || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        nationalId: nationalId?.trim() || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        hireDate: hireDate ? new Date(hireDate) : null,
        photo: photo || null,
        basicSalary: Number(basicSalary) || 0,
        housingAllowance: Number(housingAllowance) || 0,
        transportAllowance: Number(transportAllowance) || 0,
        otherAllowances: Number(otherAllowances) || 0,
        payeTax: finalPayeTax,
        pensionDeduction: Number(pensionDeduction) || 0,
        otherDeductions: Number(otherDeductions) || 0,
        status: status || "ACTIVE",
        notes: notes?.trim() || null,
      },
      include: { department: { select: { id: true, name: true } } },
    });

    await prisma.auditLog.create({
      data: {
        schoolId: req.schoolId,
        staffId: req.staff.id,
        action: "EMPLOYEE_ADDED",
        entity: "Employee",
        entityId: employee.id,
        changes: {
          fullName: employee.fullName,
          jobTitle: employee.jobTitle,
          payeTax: finalPayeTax,
        },
      },
    });

    return res.status(201).json({ success: true, data: employee });
  } catch (err) {
    console.error("Create employee error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create employee" });
  }
};

// ==================== UPDATE ====================
const updateEmployee = async (req, res) => {
  try {
    const existing = await prisma.employee.findFirst({
      where: { id: req.params.id, schoolId: req.schoolId },
    });
    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }

    const b = req.body;
    const data = {};

    if (b.honorific !== undefined) data.honorific = b.honorific?.trim() || null;
    if (b.firstName !== undefined) data.firstName = b.firstName.trim();
    if (b.lastName !== undefined) data.lastName = b.lastName.trim();
    if (b.firstName !== undefined || b.lastName !== undefined) {
      data.fullName = buildFullName(
        b.firstName ?? existing.firstName,
        b.lastName ?? existing.lastName,
      );
    }
    if (b.gender !== undefined) data.gender = b.gender || null;
    if (b.title !== undefined) data.jobTitle = b.title?.trim() || null;
    if (b.departmentId !== undefined)
      data.departmentId = b.departmentId || null;
    if (b.phone !== undefined) data.phone = b.phone?.trim() || null;
    if (b.email !== undefined) data.email = b.email?.trim() || null;
    if (b.nationalId !== undefined)
      data.nationalId = b.nationalId?.trim() || null;
    if (b.dateOfBirth !== undefined)
      data.dateOfBirth = b.dateOfBirth ? new Date(b.dateOfBirth) : null;
    if (b.hireDate !== undefined)
      data.hireDate = b.hireDate ? new Date(b.hireDate) : null;
    if (b.photo !== undefined) data.photo = b.photo || null;

    [
      "basicSalary",
      "housingAllowance",
      "transportAllowance",
      "otherAllowances",
      "pensionDeduction",
      "otherDeductions",
    ].forEach((f) => {
      if (b[f] !== undefined) data[f] = Number(b[f]) || 0;
    });

    // 🎯 Recompute PAYE based on type
    if (b.payePercent !== undefined) {
      const gross =
        (Number(b.basicSalary ?? existing.basicSalary) || 0) +
        (Number(b.housingAllowance ?? existing.housingAllowance) || 0) +
        (Number(b.transportAllowance ?? existing.transportAllowance) || 0) +
        (Number(b.otherAllowances ?? existing.otherAllowances) || 0);
      data.payeTax = computePaye(gross, b.payePercent, b.payeType || "PERCENT");
    } else if (b.payeTax !== undefined) {
      data.payeTax = Number(b.payeTax) || 0;
    }

    if (b.status !== undefined) data.status = b.status;
    if (b.terminationDate !== undefined)
      data.terminationDate = b.terminationDate
        ? new Date(b.terminationDate)
        : null;
    if (b.notes !== undefined) data.notes = b.notes?.trim() || null;

    const updated = await prisma.employee.update({
      where: { id: existing.id },
      data,
      include: { department: { select: { id: true, name: true } } },
    });

    await prisma.auditLog.create({
      data: {
        schoolId: req.schoolId,
        staffId: req.staff.id,
        action: "EMPLOYEE_UPDATED",
        entity: "Employee",
        entityId: updated.id,
        changes: b,
      },
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Update employee error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update employee" });
  }
};

// ==================== DELETE ====================
const terminateEmployee = async (req, res) => {
  try {
    const existing = await prisma.employee.findFirst({
      where: { id: req.params.id, schoolId: req.schoolId },
    });
    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }

    await prisma.employee.update({
      where: { id: existing.id },
      data: { status: "TERMINATED", terminationDate: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        schoolId: req.schoolId,
        staffId: req.staff.id,
        action: "EMPLOYEE_TERMINATED",
        entity: "Employee",
        entityId: existing.id,
        changes: { fullName: existing.fullName },
      },
    });

    return res.json({ success: true, message: "Employee terminated" });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to terminate employee" });
  }
};

module.exports = {
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  terminateEmployee,
};
