const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const prisma = require("../config/db");
const { createDefaultRolesForSchool } = require("../lib/defaultRoles");
const { sendPlatformSchoolInviteEmail } = require("../lib/mailer");

const INVITE_TTL_DAYS = 7;

// ==================== LIST SCHOOLS ====================
// GET /api/platform/schools
const listSchools = async (req, res) => {
  try {
    const schools = await prisma.school.findMany({
      where: { platformId: req.platformId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        isActive: true,
        setupCompleted: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        subscriptionEndsAt: true,
        onekhusaMerchantAccount: true,
        createdAt: true,
        _count: { select: { students: true, staff: true } },
      },
    });

    // Find the admin (first School Admin staff) for each school
    const schoolIds = schools.map((s) => s.id);
    const adminBySchool = {};
    if (schoolIds.length > 0) {
      const admins = await prisma.staff.findMany({
        where: {
          schoolId: { in: schoolIds },
          role: { name: "School Admin" },
        },
        select: {
          schoolId: true,
          email: true,
          fullName: true,
          lastLogin: true,
          // NOTE: invitationToken deliberately omitted — never expose it
        },
        orderBy: { createdAt: "asc" },
      });
      for (const a of admins) {
        if (!adminBySchool[a.schoolId]) adminBySchool[a.schoolId] = a;
      }
    }
    const data = schools.map(({ _count, ...s }) => {
      const admin = adminBySchool[s.id] || null;
      return {
        ...s,
        studentCount: _count.students,
        staffCount: _count.staff,
        admin: admin
          ? {
              email: admin.email,
              fullName: admin.fullName,
              lastLogin: admin.lastLogin,
              invitePending: !admin.lastLogin, // never logged in = invite not accepted
            }
          : null,
        onekhusaConfigured: !!s.onekhusaMerchantAccount,
      };
    });

    return res.json({ success: true, data });
  } catch (err) {
    console.error("listSchools error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to list schools" });
  }
};

// ==================== INVITE SCHOOL ====================
// POST /api/platform/schools/invite
// Body: { email, schoolName?, trialDays? }
// Creates a placeholder school, seeds roles, creates the admin with:
//   - a temp password (for immediate login)
//   - an invitation token (for the "set your own password" link)
// Email contains BOTH. Either path works independently.
const inviteSchool = async (req, res) => {
  try {
    const { email, schoolName, trialDays } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }
    const cleanEmail = String(email).toLowerCase().trim();

    // Email collision check
    const [existingStaff, existingPlatformAdmin] = await Promise.all([
      prisma.staff.findUnique({ where: { email: cleanEmail } }),
      prisma.platformAdmin.findUnique({ where: { email: cleanEmail } }),
    ]);
    if (existingStaff) {
      return res.status(409).json({
        success: false,
        message: "That email is already registered as school staff",
      });
    }
    if (existingPlatformAdmin) {
      return res.status(409).json({
        success: false,
        message: "That email is a platform admin email",
      });
    }

    // Get or create platform
    let platform = await prisma.platform.findFirst();
    if (!platform) {
      platform = await prisma.platform.create({
        data: {
          email: process.env.BREVO_SENDER_EMAIL || "admin@schoolpay.mw",
          phone: "+265000000000",
        },
      });
    }

    // Placeholder school name + unique slug
    const placeholderName = schoolName?.trim() || "Pending Setup";
    const slugBase =
      placeholderName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "school";
    const slug = `${slugBase}-${Date.now().toString(36)}`;

    // Trial window
    const days =
      Number.isFinite(Number(trialDays)) && Number(trialDays) >= 0
        ? Number(trialDays)
        : platform.defaultTrialDays;
    const trialEndsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    // Temp password — 3 blocks of 4 chars, e.g. "SP-x7Km-2pQr-9nLs"
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    const pick = () => chars[crypto.randomInt(0, chars.length)];
    const block = () => Array.from({ length: 4 }, pick).join("");
    const tempPassword = `SP-${block()}-${block()}-${block()}`;
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    // Invitation token (for the alternative link-based path)
    const inviteToken = crypto.randomBytes(32).toString("hex");
    const inviteExpires = new Date(
      Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    // Create everything in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          platformId: platform.id,
          name: placeholderName,
          slug,
          address: "",
          city: "",
          phone: "",
          email: null,
          setupCompleted: false,
          subscriptionStatus: "TRIAL",
          trialEndsAt,
        },
      });

      const roleMap = await createDefaultRolesForSchool(tx, school.id);

      const admin = await tx.staff.create({
        data: {
          schoolId: school.id,
          roleId: roleMap["School Admin"],
          title: null,
          firstName: "School",
          lastName: "Administrator",
          fullName: "School Administrator",
          email: cleanEmail,
          phone: "",
          passwordHash, // temp password — hashed
          emailVerified: true, // owner invited them; skip email verification
          invitationToken: inviteToken,
          invitationExpires: inviteExpires,
          mustChangePassword: true, // force change on first login
        },
      });

      return { school, admin };
    });

    // Send the invite email (async, don't block)
    sendPlatformSchoolInviteEmail({
      to: cleanEmail,
      name: "there",
      inviteToken,
      tempPassword,
      expiresInDays: INVITE_TTL_DAYS,
    }).catch((e) => console.error("Invite email failed:", e));

    return res.status(201).json({
      success: true,
      message: "School created and invitation sent",
      data: {
        school: {
          id: result.school.id,
          name: result.school.name,
          slug: result.school.slug,
          trialEndsAt: result.school.trialEndsAt,
        },
        admin: {
          id: result.admin.id,
          email: result.admin.email,
        },
      },
    });
  } catch (err) {
    console.error("inviteSchool error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to invite school" });
  }
};

// ==================== GET ONE ====================
// GET /api/platform/schools/:id
const getSchool = async (req, res) => {
  try {
    const school = await prisma.school.findFirst({
      where: { id: req.params.id, platformId: req.platformId },
      include: {
        staff: {
          where: { role: { name: "School Admin" } },
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            lastLogin: true,
            emailVerified: true,
          },
          take: 1,
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { students: true, staff: true } },
      },
    });

    if (!school) {
      return res
        .status(404)
        .json({ success: false, message: "School not found" });
    }

    const { _count, staff, ...rest } = school;
    return res.json({
      success: true,
      data: {
        ...rest,
        studentCount: _count.students,
        staffCount: _count.staff,
        admin: staff[0] || null,
        onekhusaConfigured: !!school.onekhusaMerchantAccount,
      },
    });
  } catch (err) {
    console.error("getSchool error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch school" });
  }
};

// ==================== UPDATE ====================
// PUT /api/platform/schools/:id
// Owner-only. Only touches owner-controlled fields.
const updateSchool = async (req, res) => {
  try {
    const { name, trialEndsAt, subscriptionEndsAt, subscriptionStatus } =
      req.body;

    const school = await prisma.school.findFirst({
      where: { id: req.params.id, platformId: req.platformId },
    });
    if (!school) {
      return res
        .status(404)
        .json({ success: false, message: "School not found" });
    }

    const data = {};
    if (name !== undefined) data.name = name;
    if (trialEndsAt !== undefined)
      data.trialEndsAt = trialEndsAt ? new Date(trialEndsAt) : null;
    if (subscriptionEndsAt !== undefined)
      data.subscriptionEndsAt = subscriptionEndsAt
        ? new Date(subscriptionEndsAt)
        : null;
    if (subscriptionStatus !== undefined)
      data.subscriptionStatus = subscriptionStatus;

    const updated = await prisma.school.update({
      where: { id: school.id },
      data,
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("updateSchool error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update school" });
  }
};

// ==================== SUSPEND / REACTIVATE ====================
// PATCH /api/platform/schools/:id/status
// Body: { isActive: boolean, reason?: string }
const updateSchoolStatus = async (req, res) => {
  try {
    const { isActive, reason } = req.body;

    if (typeof isActive !== "boolean") {
      return res
        .status(400)
        .json({ success: false, message: "isActive must be boolean" });
    }

    const school = await prisma.school.findFirst({
      where: { id: req.params.id, platformId: req.platformId },
    });
    if (!school) {
      return res
        .status(404)
        .json({ success: false, message: "School not found" });
    }

    await prisma.school.update({
      where: { id: school.id },
      data: {
        isActive,
        subscriptionStatus: isActive ? school.subscriptionStatus : "SUSPENDED",
      },
    });

    // Log reason if provided
    if (reason) {
      console.log(
        `[platform] School ${school.name} ${isActive ? "activated" : "suspended"}: ${reason}`,
      );
    }

    return res.json({
      success: true,
      message: isActive ? "School activated" : "School suspended",
    });
  } catch (err) {
    console.error("updateSchoolStatus error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update status" });
  }
};

// ==================== ONEKHUSA CONFIG ====================
// PUT /api/platform/schools/:id/onekhusa
// Body: { merchantAccount, secretSuccess, secretReversed }
const updateOneKhusa = async (req, res) => {
  try {
    const { merchantAccount, secretSuccess, secretReversed } = req.body;

    const school = await prisma.school.findFirst({
      where: { id: req.params.id, platformId: req.platformId },
    });
    if (!school) {
      return res
        .status(404)
        .json({ success: false, message: "School not found" });
    }

    const data = {};
    if (merchantAccount !== undefined)
      data.onekhusaMerchantAccount = merchantAccount?.toString().trim() || null;
    if (secretSuccess !== undefined)
      data.onekhusaWebhookSecretSuccess = secretSuccess?.trim() || null;
    if (secretReversed !== undefined)
      data.onekhusaWebhookSecretReversed = secretReversed?.trim() || null;

    const updated = await prisma.school.update({
      where: { id: school.id },
      data,
      select: {
        id: true,
        onekhusaMerchantAccount: true,
        onekhusaWebhookSecretSuccess: true,
        onekhusaWebhookSecretReversed: true,
      },
    });

    return res.json({
      success: true,
      message: "OneKhusa configuration saved",
      data: {
        merchantAccount: updated.onekhusaMerchantAccount,
        hasSuccessSecret: !!updated.onekhusaWebhookSecretSuccess,
        hasReversedSecret: !!updated.onekhusaWebhookSecretReversed,
      },
    });
  } catch (err) {
    console.error("updateOneKhusa error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to save OneKhusa config" });
  }
};

// ==================== UNLOCK SETTLEMENT ACCOUNT ====================
// POST /api/platform/schools/:id/unlock-settlement
// Owner-only. Clears the settlement fields so the school can re-enter them.
const unlockSettlement = async (req, res) => {
  try {
    const school = await prisma.school.findFirst({
      where: { id: req.params.id, platformId: req.platformId },
    });
    if (!school) {
      return res
        .status(404)
        .json({ success: false, message: "School not found" });
    }

    await prisma.school.update({
      where: { id: school.id },
      data: {
        settlementBankName: null,
        settlementAccountName: null,
        settlementAccountNumber: null,
        settlementBranch: null,
      },
    });

    return res.json({
      success: true,
      message: "Settlement account unlocked. School can now edit it.",
    });
  } catch (err) {
    console.error("unlockSettlement error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to unlock" });
  }
};

module.exports = {
  listSchools,
  inviteSchool,
  getSchool,
  updateSchool,
  updateSchoolStatus,
  updateOneKhusa,
  unlockSettlement,
};
