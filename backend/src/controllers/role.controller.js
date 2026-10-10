// backend/src/controllers/role.controller.js
const prisma = require("../config/db");

// Valid resources and actions — must match frontend
const VALID_RESOURCES = [
  "dashboard",
  "students",
  "payments",
  "classes",
  "reports",
  "sms",
  "results",
  "staff",
  "settings",
];
const VALID_ACTIONS = ["read", "write", "verify", "delete"];

const validatePermissions = (permissions) => {
  if (typeof permissions !== "object" || permissions === null) {
    return "permissions must be an object";
  }
  for (const [resource, actions] of Object.entries(permissions)) {
    if (!VALID_RESOURCES.includes(resource)) {
      return `Unknown resource: "${resource}"`;
    }
    if (!Array.isArray(actions)) {
      return `Actions for "${resource}" must be an array`;
    }
    for (const action of actions) {
      if (!VALID_ACTIONS.includes(action)) {
        return `Unknown action "${action}" on resource "${resource}"`;
      }
    }
  }
  return null;
};

// ==================== LIST ROLES ====================
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

// ==================== CREATE ROLE ====================
// POST /api/roles
const createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;

    if (!name || !name.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Role name is required" });
    }

    const permsErr = validatePermissions(permissions || {});
    if (permsErr) {
      return res.status(400).json({ success: false, message: permsErr });
    }

    // Check duplicate
    const existing = await prisma.role.findFirst({
      where: {
        schoolId: req.schoolId,
        name: { equals: name.trim(), mode: "insensitive" },
      },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A role with this name already exists",
      });
    }

    const role = await prisma.role.create({
      data: {
        schoolId: req.schoolId,
        name: name.trim(),
        description: description?.trim() || null,
        permissions: permissions || {},
        isSystem: false, // custom roles are never system
      },
      select: {
        id: true,
        name: true,
        description: true,
        permissions: true,
        isSystem: true,
        _count: { select: { staff: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        schoolId: req.schoolId,
        staffId: req.staff.id,
        action: "ROLE_CREATED",
        entity: "Role",
        entityId: role.id,
        changes: { name: role.name },
      },
    });

    return res.status(201).json({ success: true, data: role });
  } catch (err) {
    console.error("Create role error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create role" });
  }
};

// ==================== UPDATE ROLE ====================
// PUT /api/roles/:id
const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, permissions } = req.body;

    const existing = await prisma.role.findFirst({
      where: { id, schoolId: req.schoolId },
    });
    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Role not found" });
    }

    // Protect School Admin — cannot edit its permissions
    if (existing.name === "School Admin") {
      return res.status(400).json({
        success: false,
        message: "The School Admin role is protected and cannot be edited",
      });
    }

    // Validate permissions if provided
    if (permissions !== undefined) {
      const permsErr = validatePermissions(permissions);
      if (permsErr) {
        return res.status(400).json({ success: false, message: permsErr });
      }
    }

    // Check duplicate name if renaming
    if (name && name.trim() !== existing.name) {
      const dup = await prisma.role.findFirst({
        where: {
          schoolId: req.schoolId,
          name: { equals: name.trim(), mode: "insensitive" },
          id: { not: id },
        },
      });
      if (dup) {
        return res.status(409).json({
          success: false,
          message: "A role with this name already exists",
        });
      }
    }

    const updated = await prisma.role.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && {
          description: description?.trim() || null,
        }),
        ...(permissions !== undefined && { permissions }),
      },
      select: {
        id: true,
        name: true,
        description: true,
        permissions: true,
        isSystem: true,
        _count: { select: { staff: true } },
      },
    });

    // Build a human-readable summary of what changed
    const summaryParts = [];
    if (name && name !== existing.name) {
      summaryParts.push(`renamed to "${name}"`);
    }
    if (permissions !== undefined) {
      const changedResources = Object.keys(permissions).filter((r) => {
        const before = JSON.stringify(existing.permissions?.[r] || []);
        const after = JSON.stringify(permissions[r] || []);
        return before !== after;
      });
      if (changedResources.length > 0) {
        summaryParts.push(
          `updated permissions for ${changedResources.join(", ")}`,
        );
      }
    }

    await prisma.auditLog.create({
      data: {
        schoolId: req.schoolId,
        staffId: req.staff.id,
        actorName: req.staff.fullName,
        actorRole: req.staff.role?.name || null,
        actorEmail: req.staff.email,
        ipAddress: extractIp(req),
        action: "ROLE_UPDATED",
        entity: "Role",
        entityId: id,
        targetName: existing.name,
        status: "SUCCESS",
        changes: {
          summary:
            summaryParts.length > 0
              ? `${existing.name}: ${summaryParts.join(", ")}`
              : `${existing.name}: no changes`,
          permissions,
        },
      },
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    console.error("Update role error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update role" });
  }
};

// ==================== DELETE ROLE ====================
// DELETE /api/roles/:id
const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.role.findFirst({
      where: { id, schoolId: req.schoolId },
      include: { _count: { select: { staff: true } } },
    });
    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Role not found" });
    }

    // Block system roles
    if (existing.isSystem) {
      return res.status(400).json({
        success: false,
        message: "System roles cannot be deleted",
      });
    }

    // Block if staff assigned
    if (existing._count.staff > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: ${existing._count.staff} staff still assigned to this role. Reassign them first.`,
      });
    }

    await prisma.role.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        schoolId: req.schoolId,
        staffId: req.staff.id,
        action: "ROLE_DELETED",
        entity: "Role",
        entityId: id,
        changes: { name: existing.name },
      },
    });

    return res.status(200).json({ success: true, message: "Role deleted" });
  } catch (err) {
    console.error("Delete role error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete role" });
  }
};

module.exports = {
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  VALID_RESOURCES,
  VALID_ACTIONS,
};
