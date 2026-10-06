// backend/src/controllers/staff.controller.js
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const prisma = require("../config/db");
const { sendInvitationEmail } = require("../lib/mailer");
const { validatePassword } = require("../lib/passwordPolicy");

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const generateTempPassword = () => {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*";
  const all = upper + lower + digits + symbols;
  const rand = (s) => s[crypto.randomInt(0, s.length)];
  const base = [rand(upper), rand(lower), rand(digits), rand(symbols)];
  for (let i = 0; i < 8; i++) base.push(rand(all));
  for (let i = base.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [base[i], base[j]] = [base[j], base[i]];
  }
  return base.join("");
};

// Merge title + firstName + lastName into one display name
const buildFullName = (title, firstName, lastName) =>
  [title, firstName, lastName]
    .filter((p) => p && String(p).trim())
    .map((p) => String(p).trim())
    .join(" ");

// ==================== INVITE STAFF ====================
// POST /api/staff/invite
const inviteStaff = async (req, res) => {
  try {
    const { title, firstName, lastName, email, phone, roleId, departmentId } =
      req.body;

    if (!firstName || !lastName || !email || !phone || !roleId) {
      return res.status(400).json({
        success: false,
        message: "firstName, lastName, email, phone, roleId required",
      });
    }

    // Validate role belongs to this school
    const role = await prisma.role.findFirst({
      where: { id: roleId, schoolId: req.schoolId },
    });
    if (!role) {
      return res
        .status(404)
        .json({ success: false, message: "Role not found" });
    }

    // Prevent inviting another School Admin through this endpoint
    // (there is only one admin per school — the founder)
    if (role.name === "School Admin") {
      return res.status(400).json({
        success: false,
        message:
          "You cannot invite another School Admin. Choose a different role.",
      });
    }

    const existing = await prisma.staff.findUnique({ where: { email } });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: "Email already in use" });
    }

    // Validate department belongs to this school
    if (departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: departmentId, schoolId: req.schoolId },
      });
      if (!dept) {
        return res
          .status(404)
          .json({ success: false, message: "Department not found" });
      }
    }

    const tempPassword = generateTempPassword();
    const inviteToken = crypto.randomBytes(32).toString("hex");
    const tempPasswordHash = await bcrypt.hash(tempPassword, 12);
    const fullName = buildFullName(title, firstName, lastName);

    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
    });

    const invited = await prisma.staff.create({
      data: {
        schoolId: req.schoolId,
        departmentId: departmentId || null,
        roleId,
        title: title?.trim() || null,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName,
        email,
        phone,
        passwordHash: tempPasswordHash, // temp; will be replaced on accept
        emailVerified: false,
        mustChangePassword: true,
        invitedById: req.staff.id,
        invitedAt: new Date(),
        invitationToken: inviteToken,
        invitationExpires: new Date(Date.now() + INVITE_TTL_MS),
      },
      include: {
        role: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
    });

    // Send email
    await sendInvitationEmail({
      to: email,
      name: fullName,
      schoolName: school.name,
      role: role.name,
      tempPassword,
      inviteToken,
    });

    // Audit
    await prisma.auditLog.create({
      data: {
        schoolId: req.schoolId,
        staffId: req.staff.id,
        action: "STAFF_INVITED",
        entity: "Staff",
        entityId: invited.id,
        changes: { email, roleId, roleName: role.name, departmentId },
      },
    });

    return res.status(201).json({
      success: true,
      message: `Invitation sent to ${email}`,
      data: {
        id: invited.id,
        title: invited.title,
        firstName: invited.firstName,
        lastName: invited.lastName,
        fullName: invited.fullName,
        email: invited.email,
        role: invited.role,
        department: invited.department,
      },
    });
  } catch (err) {
    console.error("Invite staff error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Invitation failed" });
  }
};

// ==================== LIST STAFF ====================
// GET /api/staff
const listStaff = async (req, res) => {
  try {
    const staff = await prisma.staff.findMany({
      where: { schoolId: req.schoolId },
      select: {
        id: true,
        title: true,
        firstName: true,
        lastName: true,
        fullName: true,
        email: true,
        phone: true,
        role: { select: { id: true, name: true } },
        isActive: true,
        emailVerified: true,
        mustChangePassword: true,
        lastLogin: true,
        invitedAt: true,
        invitationExpires: true,
        createdAt: true,
        department: { select: { id: true, name: true } },
      },
      orderBy: [{ role: { name: "asc" } }, { fullName: "asc" }],
    });
    return res.status(200).json({ success: true, data: staff });
  } catch (err) {
    console.error("List staff error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to list staff" });
  }
};

// ==================== RESEND INVITE ====================
// POST /api/staff/:id/resend-invite
const resendInvite = async (req, res) => {
  try {
    const { id } = req.params;
    const member = await prisma.staff.findFirst({
      where: { id, schoolId: req.schoolId },
      include: { role: { select: { name: true } } },
    });
    if (!member)
      return res
        .status(404)
        .json({ success: false, message: "Staff not found" });

    const tempPassword = generateTempPassword();
    const inviteToken = crypto.randomBytes(32).toString("hex");

    await prisma.staff.update({
      where: { id },
      data: {
        passwordHash: await bcrypt.hash(tempPassword, 12),
        invitationToken: inviteToken,
        invitationExpires: new Date(Date.now() + INVITE_TTL_MS),
        mustChangePassword: true,
      },
    });

    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
    });
    await sendInvitationEmail({
      to: member.email,
      name: member.fullName,
      schoolName: school.name,
      role: member.role.name,
      tempPassword,
      inviteToken,
    });

    return res
      .status(200)
      .json({ success: true, message: "Invitation resent" });
  } catch (err) {
    console.error("Resend invite error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to resend" });
  }
};

// ==================== UPDATE STAFF (role + department + active) ====================
// PUT /api/staff/:id
const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { roleId, departmentId, isActive } = req.body;

    const existing = await prisma.staff.findFirst({
      where: { id, schoolId: req.schoolId },
    });
    if (!existing)
      return res
        .status(404)
        .json({ success: false, message: "Staff not found" });

    // Validate role if provided
    if (roleId) {
      const role = await prisma.role.findFirst({
        where: { id: roleId, schoolId: req.schoolId },
      });
      if (!role) {
        return res
          .status(404)
          .json({ success: false, message: "Role not found" });
      }
    }

    // Prevent admin from changing their own role
    if (existing.id === req.staff.id && roleId && roleId !== existing.roleId) {
      return res
        .status(400)
        .json({ success: false, message: "You cannot change your own role" });
    }

    // Prevent self-deactivation
    if (
      existing.id === req.staff.id &&
      isActive !== undefined &&
      isActive === false
    ) {
      return res.status(400).json({
        success: false,
        message: "You cannot deactivate your own account",
      });
    }

    // Validate department if provided
    if (departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: departmentId, schoolId: req.schoolId },
      });
      if (!dept) {
        return res
          .status(404)
          .json({ success: false, message: "Department not found" });
      }
    }

    const updated = await prisma.staff.update({
      where: { id },
      data: {
        ...(roleId && { roleId }),
        ...(departmentId !== undefined && {
          departmentId: departmentId || null,
        }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        role: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        schoolId: req.schoolId,
        staffId: req.staff.id,
        action: "STAFF_UPDATED",
        entity: "Staff",
        entityId: id,
        changes: { roleId, departmentId, isActive },
      },
    });

    return res
      .status(200)
      .json({ success: true, message: "Staff updated", data: updated });
  } catch (err) {
    console.error("Update staff error:", err);
    return res.status(500).json({ success: false, message: "Update failed" });
  }
};

// ==================== DELETE STAFF (soft delete) ====================
// DELETE /api/staff/:id
const removeStaff = async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.staff.id) {
      return res
        .status(400)
        .json({ success: false, message: "You cannot remove yourself" });
    }

    const existing = await prisma.staff.findFirst({
      where: { id, schoolId: req.schoolId },
    });
    if (!existing)
      return res
        .status(404)
        .json({ success: false, message: "Staff not found" });

    await prisma.staff.update({
      where: { id },
      data: { isActive: false },
    });

    await prisma.auditLog.create({
      data: {
        schoolId: req.schoolId,
        staffId: req.staff.id,
        action: "STAFF_DEACTIVATED",
        entity: "Staff",
        entityId: id,
      },
    });

    return res
      .status(200)
      .json({ success: true, message: "Staff deactivated" });
  } catch (err) {
    console.error("Remove staff error:", err);
    return res.status(500).json({ success: false, message: "Remove failed" });
  }
};

module.exports = {
  inviteStaff,
  listStaff,
  resendInvite,
  updateStaff,
  removeStaff,
};
