const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const prisma = require("../config/db");
const { createDefaultRolesForSchool } = require("../lib/defaultRoles");
const { sendPlatformSchoolInviteEmail } = require("../lib/mailer");

const INVITE_TTL_DAYS = 7;

// 🎯 Tier limits — matches your pricing PDF
const TIER_CONFIG = {
  SMALL: { maxStudents: 150, price: 150000 },
  MEDIUM: { maxStudents: 400, price: 250000 },
  LARGE: { maxStudents: 99999, price: 400000 },
};

// ==================== SUBMIT (Public — from marketing site) ====================
const submitRequest = async (req, res) => {
  try {
    const { name, email, phone, schoolName, tier } = req.body;
    if (!name || !email || !schoolName) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Name, email and school name are required",
        });
    }

    const cleanEmail = String(email).toLowerCase().trim();

    // Block duplicate pending requests for the same email
    const existing = await prisma.schoolRequest.findFirst({
      where: { email: cleanEmail, status: "PENDING" },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message:
          "You already have a pending request. We'll review it within 24 hours.",
      });
    }

    const request = await prisma.schoolRequest.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        phone: (phone || "").trim(),
        schoolName: schoolName.trim(),
        tier: TIER_CONFIG[tier] ? tier : "SMALL",
      },
    });

    return res.status(201).json({
      success: true,
      message:
        "Request received. You will get your login link within 24 hours.",
      data: { id: request.id },
    });
  } catch (err) {
    console.error("Submit request error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to submit request" });
  }
};

// ==================== LIST (Platform Admin) ====================
const listRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};
    const requests = await prisma.schoolRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return res.json({ success: true, data: requests });
  } catch (err) {
    console.error("List requests error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load requests" });
  }
};

// ==================== PENDING COUNT (for sidebar badge) ====================
const getPendingCount = async (req, res) => {
  try {
    const count = await prisma.schoolRequest.count({
      where: { status: "PENDING" },
    });
    return res.json({ success: true, data: { count } });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed" });
  }
};

// ==================== APPROVE (Platform Admin) ====================
const approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await prisma.schoolRequest.findUnique({ where: { id } });
    if (!request) {
      return res
        .status(404)
        .json({ success: false, message: "Request not found" });
    }
    if (request.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status.toLowerCase()}`,
      });
    }

    // Email must not already be a staff member
    const existingStaff = await prisma.staff.findUnique({
      where: { email: request.email },
    });
    if (existingStaff) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered on the platform.",
      });
    }

    const tierData = TIER_CONFIG[request.tier] || TIER_CONFIG.SMALL;

    // Ensure a Platform record exists
    let platform = await prisma.platform.findFirst();
    if (!platform) {
      platform = await prisma.platform.create({
        data: {
          email: process.env.BREVO_SENDER_EMAIL || "admin@schoolpay.mw",
          phone: "+265000000000",
        },
      });
    }

    // Slug + trial window
    const slugBase =
      request.schoolName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "school";
    const slug = `${slugBase}-${Date.now().toString(36)}`;
    const trialDays = platform.defaultTrialDays;
    const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

    // Temp password: SP-xxxx-xxxx-xxxx
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    const pick = () => chars[crypto.randomInt(0, chars.length)];
    const block = () => Array.from({ length: 4 }, pick).join("");
    const tempPassword = `SP-${block()}-${block()}-${block()}`;
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    // Invitation token
    const inviteToken = crypto.randomBytes(32).toString("hex");
    const inviteExpires = new Date(
      Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    // Create school + admin + update request in one transaction
    const result = await prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          platformId: platform.id,
          name: request.schoolName,
          slug,
          address: "",
          city: "",
          phone: request.phone,
          email: request.email,
          setupCompleted: false,
          subscriptionStatus: "TRIAL",
          trialEndsAt,
          tier: request.tier,
          maxStudents: tierData.maxStudents,
        },
      });

      const roleMap = await createDefaultRolesForSchool(tx, school.id);

      const nameParts = request.name.trim().split(/\s+/);
      const fName = nameParts[0] || "School";
      const lName = nameParts.slice(1).join(" ") || "Administrator";

      const admin = await tx.staff.create({
        data: {
          schoolId: school.id,
          roleId: roleMap["School Admin"],
          title: null,
          firstName: fName,
          lastName: lName,
          fullName: request.name,
          email: request.email,
          phone: request.phone,
          passwordHash,
          emailVerified: true,
          invitationToken: inviteToken,
          invitationExpires: inviteExpires,
          mustChangePassword: true,
        },
      });

      await tx.schoolRequest.update({
        where: { id: request.id },
        data: { status: "APPROVED" },
      });

      return { school, admin };
    });

    // Send invitation email (non-blocking — we already created the school)
    let emailSent = true;
    try {
      const emailRes = await sendPlatformSchoolInviteEmail({
        to: request.email,
        name: request.name,
        inviteToken,
        tempPassword,
        expiresInDays: INVITE_TTL_DAYS,
      });
      if (emailRes?.skipped || emailRes?.success === false) {
        emailSent = false;
        console.error("❌ Invite email failed:", emailRes);
      }
    } catch (e) {
      emailSent = false;
      console.error("❌ Invite email threw:", e.message);
    }

    return res.status(200).json({
      success: true,
      message: emailSent
        ? "School created and invitation email sent."
        : "School created, but the email failed to send. Check Brevo logs.",
      data: {
        school: {
          id: result.school.id,
          name: result.school.name,
          tier: result.school.tier,
        },
        admin: { id: result.admin.id, email: result.admin.email },
        emailSent,
      },
    });
  } catch (err) {
    console.error("Approve request error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to approve request" });
  }
};

// ==================== REJECT ====================
const rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await prisma.schoolRequest.findUnique({ where: { id } });
    if (!request)
      return res
        .status(404)
        .json({ success: false, message: "Request not found" });
    if (request.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status.toLowerCase()}`,
      });
    }

    await prisma.schoolRequest.update({
      where: { id },
      data: { status: "REJECTED" },
    });
    return res.json({ success: true, message: "Request rejected" });
  } catch (err) {
    console.error("Reject request error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to reject request" });
  }
};

module.exports = {
  submitRequest,
  listRequests,
  approveRequest,
  rejectRequest,
  getPendingCount,
};
