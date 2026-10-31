const prisma = require("../config/db");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { sendPlatformSchoolInviteEmail } = require("../lib/mailer");
const { createDefaultRolesForSchool } = require("../lib/defaultRoles");

// 1. GET /api/group/schools
// Returns all schools in the group
const listGroupSchools = async (req, res) => {
  try {
    if (!req.staff.groupId) {
      return res
        .status(403)
        .json({ success: false, message: "Not a group admin" });
    }

    const schools = await prisma.school.findMany({
      where: { groupId: req.staff.groupId },
      select: {
        id: true,
        name: true,
        logo: true,
        subscriptionStatus: true,
        setupCompleted: true,
        _count: { select: { students: true, staff: true } },
      },
      orderBy: { name: "asc" },
    });

    res.json({ success: true, data: schools });
  } catch (err) {
    console.error("listGroupSchools error:", err);
    res.status(500).json({ success: false, message: "Failed to load schools" });
  }
};

// 2. POST /api/group/schools
// Allows Group Director to add a new school to their group
const addSchoolToGroup = async (req, res) => {
  try {
    const { schoolName, adminEmail, adminFirstName, adminLastName } = req.body;

    if (!schoolName || !adminEmail) {
      return res.status(400).json({
        success: false,
        message: "School name and admin email are required",
      });
    }

    // Check if email exists
    const existing = await prisma.staff.findUnique({
      where: { email: adminEmail },
    });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: "Email already in use" });
    }

    const platform = await prisma.platform.findFirst();
    const slug = `${schoolName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`;

    // Generate invite
    const tempPassword = `SP-${crypto.randomBytes(2).toString("hex")}-${crypto.randomBytes(2).toString("hex")}`;
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    const inviteToken = crypto.randomBytes(32).toString("hex");

    const result = await prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          platformId: platform.id,
          groupId: req.staff.groupId,
          name: schoolName,
          slug,
          address: "",
          city: "",
          phone: "",
          subscriptionStatus: "TRIAL",
          trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const roleMap = await createDefaultRolesForSchool(tx, school.id);

      const admin = await tx.staff.create({
        data: {
          schoolId: school.id,
          roleId: roleMap["School Admin"],
          firstName: adminFirstName || "School",
          lastName: adminLastName || "Administrator",
          fullName:
            `${adminFirstName || "School"} ${adminLastName || "Administrator"}`.trim(),
          email: adminEmail,
          phone: "",
          passwordHash,
          emailVerified: true,
          invitationToken: inviteToken,
          invitationExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          mustChangePassword: true,
          isGroupAdmin: false,
        },
      });

      return { school, admin };
    });

    await sendPlatformSchoolInviteEmail({
      to: adminEmail,
      name: `${adminFirstName || ""} ${adminLastName || ""}`.trim() || "there",
      inviteToken,
      tempPassword,
      expiresInDays: 7,
    });

    res.status(201).json({
      success: true,
      message: "School added and admin invited",
      data: result.school,
    });
  } catch (err) {
    console.error("addSchoolToGroup error:", err);
    res.status(500).json({ success: false, message: "Failed to add school" });
  }
};

module.exports = { listGroupSchools, addSchoolToGroup };
