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

// ==================== INVITE STAFF ====================
// POST /api/staff/invite
const inviteStaff = async (req, res) => {
  try {
    const { fullName, email, phone, role, departmentId } = req.body;

    if (!fullName || !email || !phone || !role) {
      return res.status(400).json({
        success: false,
        message: "fullName, email, phone, role required",
      });
    }

    // Restrict roles that can be assigned
    const allowedRoles = ["BURSAR", "FINANCE", "TEACHER", "REGISTRAR", "OTHER"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
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

    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
    });

    const invited = await prisma.staff.create({
      data: {
        schoolId: req.schoolId,
        departmentId: departmentId || null,
        fullName,
        email,
        phone,
        role,
        passwordHash: tempPasswordHash, // temp; will be replaced on accept
        emailVerified: false,
        mustChangePassword: true,
        invitedById: req.staff.id,
        invitedAt: new Date(),
        invitationToken: inviteToken,
        invitationExpires: new Date(Date.now() + INVITE_TTL_MS),
      },
      include: {
        department: { select: { id: true, name: true } },
      },
    });

    // Send email
    await sendInvitationEmail({
      to: email,
      name: fullName,
      schoolName: school.name,
      role,
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
        changes: { email, role, departmentId },
      },
    });

    return res.status(201).json({
      success: true,
      message: `Invitation sent to ${email}`,
      data: {
        id: invited.id,
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
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        emailVerified: true,
        mustChangePassword: true,
        lastLogin: true,
        invitedAt: true,
        invitationExpires: true,
        createdAt: true,
        department: { select: { id: true, name: true } },
      },
      orderBy: [{ role: "asc" }, { fullName: "asc" }],
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
      role: member.role,
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
    const { role, departmentId, isActive } = req.body;

    const existing = await prisma.staff.findFirst({
      where: { id, schoolId: req.schoolId },
    });
    if (!existing)
      return res
        .status(404)
        .json({ success: false, message: "Staff not found" });

    // Prevent admin from demoting themselves (safety)
    if (existing.id === req.staff.id && role && role !== existing.role) {
      return res
        .status(400)
        .json({ success: false, message: "You cannot change your own role" });
    }

    const updated = await prisma.staff.update({
      where: { id },
      data: {
        ...(role && { role }),
        ...(departmentId !== undefined && {
          departmentId: departmentId || null,
        }),
        ...(isActive !== undefined && { isActive }),
      },
      include: { department: { select: { id: true, name: true } } },
    });

    await prisma.auditLog.create({
      data: {
        schoolId: req.schoolId,
        staffId: req.staff.id,
        action: "STAFF_UPDATED",
        entity: "Staff",
        entityId: id,
        changes: { role, departmentId, isActive },
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
