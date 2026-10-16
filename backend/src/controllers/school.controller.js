const prisma = require("../config/db");
const { uploadToCloudinary } = require("../lib/cloudinary");

// Turn "St Peters Private School" into "st-peters-private-school"
const slugify = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

// GET /api/schools/settings
const getSettings = async (req, res) => {
  try {
    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        phone: true,
        email: true,
        logo: true,
        motto: true,
        primaryColor: true,
      },
    });

    if (!school) {
      return res
        .status(404)
        .json({ success: false, message: "School not found" });
    }

    res.json({ success: true, data: school });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to get settings" });
  }
};

const updateSettings = async (req, res) => {
  try {
    const { name, address, city, phone, email, motto, primaryColor } = req.body;

    // Auto-generate a slug the first time a school is saved, if it doesn't have one yet
    const existing = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: { slug: true },
    });

    let slugUpdate = {};
    if (!existing.slug && name) {
      let baseSlug = slugify(name);
      let candidate = baseSlug;
      let counter = 1;
      // Ensure uniqueness in case two schools have similar names
      while (
        await prisma.school.findFirst({
          where: { slug: candidate, id: { not: req.schoolId } },
        })
      ) {
        candidate = `${baseSlug}-${counter}`;
        counter++;
      }
      slugUpdate = { slug: candidate };
    }

    const updated = await prisma.school.update({
      where: { id: req.schoolId },
      data: {
        ...(name && { name }),
        ...(address && { address }),
        ...(city && { city }),
        ...(phone && { phone }),
        ...(email !== undefined && { email }),
        ...(motto !== undefined && { motto }),
        ...(primaryColor !== undefined && { primaryColor }),
        ...slugUpdate,
      },
    });

    await prisma.auditLog.create({
      data: {
        schoolId: req.schoolId,
        staffId: req.staff.id,
        action: "SCHOOL_SETTINGS_UPDATED",
        entity: "School",
        entityId: req.schoolId,
        changes: { name, address, city, phone, email, motto, primaryColor },
      },
    });

    res.json({
      success: true,
      message: "Settings updated successfully",
      data: updated,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to update settings" });
  }
};

// POST /api/schools/settings/logo
const uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No logo file provided" });
    }

    const result = await uploadToCloudinary(req.file.buffer, {
      folder: process.env.CLOUDINARY_LOGO_FOLDER || "school_logos",
    });

    const updated = await prisma.school.update({
      where: { id: req.schoolId },
      data: { logo: result.secure_url },
    });

    await prisma.auditLog.create({
      data: {
        schoolId: req.schoolId,
        staffId: req.staff.id,
        action: "SCHOOL_LOGO_UPDATED",
        entity: "School",
        entityId: req.schoolId,
        changes: { logo: result.secure_url },
      },
    });

    res.json({
      success: true,
      message: "Logo uploaded successfully",
      data: { logo: updated.logo },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to upload logo" });
  }
};

// GET /api/schools/by-slug/:slug
// Public — no auth. Used on the branded login page (/login/:slug) to show
// that school's logo/name/motto before the user has typed anything.
const getBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const school = await prisma.school.findUnique({
      where: { slug },
      select: { name: true, logo: true, motto: true, primaryColor: true },
    });

    if (!school) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.json({ success: true, data: school });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lookup failed" });
  }
};

// GET /api/schools/lookup-by-email?email=...
// Public — no auth. Used on the staff login page to preview the school's
// logo before the admin has signed in, based on their staff email.
const lookupByEmail = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const staff = await prisma.staff.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        school: {
          select: { name: true, logo: true, primaryColor: true },
        },
      },
    });

    if (!staff) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.json({ success: true, data: staff.school });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lookup failed" });
  }
};

const getPublicSchool = async (req, res) => {
  try {
    const school = await prisma.school.findFirst({
      select: {
        id: true,
        name: true,
        logo: true,
        motto: true,
        primaryColor: true,
      },
    });

    if (!school) {
      return res
        .status(404)
        .json({ success: false, message: "No school found" });
    }

    res.json({ success: true, data: school });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to get school info" });
  }
};

// GET /api/schools/public/:schoolId
// Public — no auth. Used to show school branding (logo/name/motto) on pages
// where the schoolId is already known but the user isn't logged in yet.
const getPublicInfo = async (req, res) => {
  try {
    const school = await prisma.school.findUnique({
      where: { id: req.params.schoolId },
      select: { name: true, logo: true, motto: true, primaryColor: true },
    });

    if (!school) {
      return res
        .status(404)
        .json({ success: false, message: "School not found" });
    }

    res.json({ success: true, data: school });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to get school info" });
  }
};
// ==================== ONEKHUSA STATUS (read-only) ====================
// GET /api/schools/settings/onekhusa-status
// Returns whether the school is configured for online payments.
// NEVER returns the raw webhook secrets — only booleans.
const getOneKhusaStatus = async (req, res) => {
  try {
    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: {
        onekhusaMerchantAccount: true,
        onekhusaWebhookSecretSuccess: true,
        onekhusaWebhookSecretReversed: true,
      },
    });

    if (!school) {
      return res
        .status(404)
        .json({ success: false, message: "School not found" });
    }

    // Mask merchant account: show first 2 + last 2 digits only
    let masked = null;
    if (school.onekhusaMerchantAccount) {
      const m = String(school.onekhusaMerchantAccount);
      masked = m.length <= 4 ? "••••" : `${m.slice(0, 2)}••••${m.slice(-2)}`;
    }

    return res.json({
      success: true,
      data: {
        configured: !!school.onekhusaMerchantAccount,
        merchantAccountMasked: masked,
        hasSuccessSecret: !!school.onekhusaWebhookSecretSuccess,
        hasReversedSecret: !!school.onekhusaWebhookSecretReversed,
      },
    });
  } catch (err) {
    console.error("getOneKhusaStatus error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load status" });
  }
};

// ==================== SETTLEMENT ACCOUNT (read-only for school) ====================
// GET /api/schools/settings/settlement-account
// Returns current settlement + any pending change request.
const getSettlementAccount = async (req, res) => {
  try {
    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: {
        settlementBankName: true,
        settlementAccountName: true,
        settlementAccountNumber: true,
        settlementBranch: true,
      },
    });

    if (!school) {
      return res
        .status(404)
        .json({ success: false, message: "School not found" });
    }

    // Any pending (UNREAD or READ) settlement request for this school?
    const pending = await prisma.notification.findFirst({
      where: {
        schoolId: req.schoolId,
        type: "SETTLEMENT_CHANGE_REQUEST",
        status: { in: ["UNREAD", "READ"] },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      success: true,
      data: {
        ...school,
        isLocked: !!school.settlementAccountNumber,
        pendingRequest: pending
          ? {
              id: pending.id,
              submittedAt: pending.createdAt,
              proposed: pending.payload,
            }
          : null,
      },
    });
  } catch (err) {
    console.error("getSettlementAccount error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load settlement account" });
  }
};

// POST /api/schools/settings/settlement-change-request
// Body: { bankName, accountName, accountNumber, branch, reason }
// School submits a request. Creates a notification for the platform owner.
const requestSettlementChange = async (req, res) => {
  try {
    const { bankName, accountName, accountNumber, branch, reason } = req.body;

    if (!bankName || !accountName || !accountNumber) {
      return res.status(400).json({
        success: false,
        message: "Bank name, account name and account number are required",
      });
    }

    // Only one pending at a time
    const existing = await prisma.notification.findFirst({
      where: {
        schoolId: req.schoolId,
        type: "SETTLEMENT_CHANGE_REQUEST",
        status: { in: ["UNREAD", "READ"] },
      },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "You already have a pending settlement change request.",
        code: "REQUEST_PENDING",
      });
    }

    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: { id: true, name: true, platformId: true },
    });
    if (!school) {
      return res
        .status(404)
        .json({ success: false, message: "School not found" });
    }

    const notification = await prisma.notification.create({
      data: {
        platformId: school.platformId,
        schoolId: school.id,
        type: "SETTLEMENT_CHANGE_REQUEST",
        title: "Settlement Account Change Request",
        message: `${school.name} requested a change to their settlement account.`,
        payload: {
          bankName: bankName.trim(),
          accountName: accountName.trim(),
          accountNumber: accountNumber.trim(),
          branch: branch?.trim() || null,
          reason: reason?.trim() || null,
        },
        actorStaffId: req.staff.id,
        actorName: req.staff.fullName,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Request submitted. The platform owner will review it.",
      data: { id: notification.id },
    });
  } catch (err) {
    console.error("requestSettlementChange error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to submit request" });
  }
};
// ==================== UPDATE NOTIFICATION DEFAULTS ====================

const updateNotificationDefaults = async (req, res) => {
  try {
    const { defaultChannel } = req.body;

    if (!["SMS", "EMAIL", "BOTH"].includes(defaultChannel)) {
      return res.status(400).json({
        success: false,
        message: "defaultChannel must be SMS, EMAIL, or BOTH",
      });
    }

    const updated = await prisma.school.update({
      where: { id: req.schoolId },
      data: {
        notificationDefaults: { defaultChannel },
      },
      select: { id: true, notificationDefaults: true },
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    console.error("Update notification defaults error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update preferences" });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  uploadLogo,
  getPublicInfo,
  lookupByEmail,
  getBySlug,
  getPublicSchool,
  updateNotificationDefaults,
  getOneKhusaStatus,
  getSettlementAccount,
  requestSettlementChange,
};
