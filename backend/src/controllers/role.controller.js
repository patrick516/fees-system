const prisma = require("../config/db");

// GET /api/roles
const listRoles = async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      where: { schoolId: req.schoolId },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        permissions: true,
        isSystem: true,
        _count: { select: { staff: true } },
      },
    });
    return res.status(200).json({ success: true, data: roles });
  } catch (err) {
    console.error("List roles error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to list roles" });
  }
};

module.exports = { listRoles };
