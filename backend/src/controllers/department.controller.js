// backend/src/controllers/department.controller.js
const prisma = require("../config/db");

// GET /api/departments
const listDepartments = async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      where: { schoolId: req.schoolId },
      include: { _count: { select: { staff: true } } },
      orderBy: { name: "asc" },
    });
    return res.status(200).json({ success: true, data: departments });
  } catch (err) {
    console.error("List departments error:", err);
    return res.status(500).json({ success: false, message: "Failed" });
  }
};

// POST /api/departments
const createDepartment = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name)
      return res.status(400).json({ success: false, message: "Name required" });

    const exists = await prisma.department.findFirst({
      where: {
        schoolId: req.schoolId,
        name: { equals: name, mode: "insensitive" },
      },
    });
    if (exists)
      return res
        .status(409)
        .json({ success: false, message: "Department already exists" });

    const dept = await prisma.department.create({
      data: {
        schoolId: req.schoolId,
        name: name.trim(),
        description: description?.trim() || null,
      },
    });
    return res.status(201).json({ success: true, data: dept });
  } catch (err) {
    console.error("Create department error:", err);
    return res.status(500).json({ success: false, message: "Failed" });
  }
};

// PUT /api/departments/:id
const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const existing = await prisma.department.findFirst({
      where: { id, schoolId: req.schoolId },
    });
    if (!existing)
      return res.status(404).json({ success: false, message: "Not found" });

    const updated = await prisma.department.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && {
          description: description?.trim() || null,
        }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    console.error("Update department error:", err);
    return res.status(500).json({ success: false, message: "Failed" });
  }
};

// DELETE /api/departments/:id
const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.department.findFirst({
      where: { id, schoolId: req.schoolId },
      include: { _count: { select: { staff: true } } },
    });
    if (!existing)
      return res.status(404).json({ success: false, message: "Not found" });

    if (existing._count.staff > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: ${existing._count.staff} staff still assigned`,
      });
    }

    await prisma.department.delete({ where: { id } });
    return res.status(200).json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("Delete department error:", err);
    return res.status(500).json({ success: false, message: "Failed" });
  }
};

module.exports = {
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
};
