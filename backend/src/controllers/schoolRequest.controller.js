const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const prisma = require("../config/db");
const { createDefaultRolesForSchool } = require("../lib/defaultRoles");
const { sendPlatformSchoolInviteEmail } = require("../lib/mailer");

const INVITE_TTL_DAYS = 7;

// 🎯 Fallback tiers if the platform hasn't configured any yet
const FALLBACK_TIERS = [
  { id: "SMALL", name: "Small School", maxStudents: 150, price: 150000 },
  { id: "MEDIUM", name: "Medium School", maxStudents: 400, price: 250000 },
  { id: "LARGE", name: "Large School", maxStudents: 99999, price: 400000 },
];

// ==================== SUBMIT (Public) ====================
const submitRequest = async (req, res) => {
  try {
    const { name, email, phone, schoolName, tier } = req.body;
    if (!name || !email || !schoolName) {
      return res.status(400).json({
        success: false,
        message: "Name, email and school name are required",
      });
    }

    const cleanEmail = String(email).toLowerCase().trim();

    // 1. Check if the email is already a Staff member
    const existingStaff = await prisma.staff.findUnique({
      where: { email: cleanEmail },
    });
    if (existingStaff) {
      return res.status(409).json({
        success: false,
        message:
          "This email is already registered as a School Admin on another school.",
      });
    }

    // 2. Check if the email is already a Platform Admin (Super Admin)
    const existingPlatformAdmin = await prisma.platformAdmin.findUnique({
      where: { email: cleanEmail },
    });
    if (existingPlatformAdmin) {
      return res.status(409).json({
        success: false,
        message:
          "This email is registered as a Platform Owner. Please use a different email for the school admin.",
      });
    }

    // 3. Block duplicate pending requests
    const existingRequest = await prisma.schoolRequest.findFirst({
      where: { email: cleanEmail, status: "PENDING" },
    });
    if (existingRequest) {
      return res.status(409).json({
        success: false,
        message:
          "You already have a pending request. We'll review it within 24 hours.",
      });
    }

    // 4. Validate tier against dynamic database tiers
    const platform = await prisma.platform.findFirst();
    const availableTiers = platform?.tiers || FALLBACK_TIERS;
    const isValidTier = availableTiers.some((t) => t.id === tier);
    const finalTier = isValidTier ? tier : availableTiers[0].id; // Default to first tier

    const request = await prisma.schoolRequest.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        phone: (phone || "").trim(),
        schoolName: schoolName.trim(),
        tier: finalTier,
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

// ==================== LIST ====================
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

//  PENDING COUNT
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

//  APPROVE
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

    // 1. Check Staff collision
    const existingStaff = await prisma.staff.findUnique({
      where: { email: request.email },
    });
    if (existingStaff) {
      return res.status(409).json({
        success: false,
        message:
          "This email is already registered as a school admin. Cannot create a duplicate.",
      });
    }

    // 2. Check Platform Admin collision
    const existingPlatformAdmin = await prisma.platformAdmin.findUnique({
      where: { email: request.email },
    });
    if (existingPlatformAdmin) {
      return res.status(409).json({
        success: false,
        message:
          "This email is registered as a Platform Owner. Cannot create a school admin with this email.",
      });
    }

    // 3. Fetch Platform and Dynamic Tiers
    let platform = await prisma.platform.findFirst();
    if (!platform) {
      platform = await prisma.platform.create({
        data: {
          email: process.env.BREVO_SENDER_EMAIL || "admin@schoolpay.mw",
          phone: "+265000000000",
        },
      });
    }

    const availableTiers = platform.tiers || FALLBACK_TIERS;
    const selectedTier =
      availableTiers.find((t) => t.id === request.tier) || availableTiers[0];
    const maxStudentsLimit = selectedTier.maxStudents;

    // 4. Setup School Details
    const slugBase =
      request.schoolName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "school";
    const slug = `${slugBase}-${Date.now().toString(36)}`;
    const trialDays = platform.defaultTrialDays;
    const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

    // 5. Generate Credentials
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    const pick = () => chars[crypto.randomInt(0, chars.length)];
    const block = () => Array.from({ length: 4 }, pick).join("");
    const tempPassword = `SP-${block()}-${block()}-${block()}`;
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const inviteToken = crypto.randomBytes(32).toString("hex");
    const inviteExpires = new Date(
      Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    // 6. Create Everything in a Transaction
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
          tier: selectedTier.id,
          maxStudents: maxStudentsLimit, // 🎯 Dynamic Limit from DB
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

    // 7. Send Invitation Email
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
