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
//  ONEKHUSA STATUS (read-only)
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

//  SETTLEMENT ACCOUNT (read-only for school)
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
//  UPDATE NOTIFICATION DEFAULTS

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

//  INITIATE SUBSCRIPTION PAYMENT
// POST /api/schools/subscription/pay
const onekhusa = require("../lib/onekhusa"); // Make sure this is imported at top

const initiateSubscriptionPayment = async (req, res) => {
  try {
    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
    });
    const platform = await prisma.platform.findFirst();

    if (!platform?.subscriptionMerchantAccount) {
      return res.status(400).json({
        success: false,
        message: "Platform subscription payment is not configured yet.",
      });
    }

    const amount = platform.defaultTermPrice;
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Subscription price is not set.",
      });
    }

    const term = school.activeTerm || "TERM_1";
    const academicYear = school.activeAcademicYear || "2026-2027";

    // OneKhusa requires reference numbers to be 5-25 alphanumeric characters (no hyphens)
    // We slice the slug first to guarantee the timestamp is never truncated
    const cleanSlug = school.slug
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 10);
    const timestamp = Date.now().toString(36).toUpperCase();
    const reference = `SUB${cleanSlug}${timestamp}`; // e.g., SUBPENDINGSETM1B2C3

    // 1. Create payment record
    const payment = await prisma.subscriptionPayment.create({
      data: {
        schoolId: school.id,
        amount,
        currency: platform.currency || "MWK",
        term,
        academicYear,
        method: "ONEKHUSA",
        status: "PENDING",
        onekhusaTransactionRef: reference,
        onekhusaStatus: "Processing",
      },
    });

    // 2. Call OneKhusa using the PLATFORM's merchant account
    const result = await onekhusa.requestToPay({
      merchantAccountNumber: platform.subscriptionMerchantAccount,
      referenceNumber: reference,
      amount,
      description: `SchoolPay Subscription - ${school.name}`,
      capturedBy: platform.email || "admin@schoolpay.mw",
    });

    // 3. Update record with TAN
    await prisma.subscriptionPayment.update({
      where: { id: payment.id },
      data: {
        onekhusaTimedAccount: result.timedAccountNumber,
        onekhusaStatus: "AwaitingPayment",
        onekhusaRawResponse: result,
      },
    });

    return res.status(202).json({
      success: true,
      message: "Payment initiated. Send money to the account number.",
      data: {
        paymentId: payment.id,
        timedAccountNumber: result.timedAccountNumber,
        amount,
        expiryDate: result.expiryDate,
      },
    });
  } catch (err) {
    console.error(" ONEKHUSA SUBSCRIPTION INITIATE FAILED ");
    console.error("Message:", err.message);
    console.error("Status:", err.response?.status);
    console.error(
      "Response body:",
      JSON.stringify(err.response?.data, null, 2),
    );
    console.error("=======");

    return res.status(500).json({
      success: false,
      message:
        err.response?.data?.errors?.[0]?.description ||
        "Failed to initiate payment",
    });
  }
};

//  CHECK SUBSCRIPTION PAYMENT STATUS
// GET /api/schools/subscription/status/:paymentId
const getSubscriptionPaymentStatus = async (req, res) => {
  try {
    const payment = await prisma.subscriptionPayment.findFirst({
      where: { id: req.params.paymentId, schoolId: req.schoolId },
      select: { status: true },
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    return res.json({ success: true, status: payment.status });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed" });
  }
};

//  ONBOARDING STATUS
// GET /api/schools/onboarding-status
const getOnboardingStatus = async (req, res) => {
  try {
    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: { activeTerm: true, activeAcademicYear: true },
    });

    if (!school) {
      return res
        .status(404)
        .json({ success: false, message: "School not found" });
    }

    const [classCount, feeCount, studentCount] = await Promise.all([
      prisma.class.count({ where: { schoolId: req.schoolId } }),
      prisma.feeStructure.count({ where: { schoolId: req.schoolId } }),
      prisma.student.count({ where: { schoolId: req.schoolId } }),
    ]);

    const hasClasses = classCount > 0;
    const hasFeeStructures = feeCount > 0;
    const hasActiveTerm = !!(school.activeTerm && school.activeAcademicYear);
    const hasStudents = studentCount > 0;

    const isComplete =
      hasClasses && hasFeeStructures && hasActiveTerm && hasStudents;

    return res.json({
      success: true,
      data: {
        hasClasses,
        hasFeeStructures,
        hasActiveTerm,
        hasStudents,
        isComplete,
      },
    });
  } catch (err) {
    console.error("getOnboardingStatus error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to check status" });
  }
};
// ==================== GET TIER STATUS ====================
// GET /api/schools/tier-status
const getTierStatus = async (req, res) => {
  try {
    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: { tier: true, maxStudents: true },
    });

    if (!school) {
      return res
        .status(404)
        .json({ success: false, message: "School not found" });
    }

    const activeStudents = await prisma.student.count({
      where: { schoolId: req.schoolId, isActive: true },
    });

    return res.json({
      success: true,
      data: {
        tier: school.tier,
        maxStudents: school.maxStudents,
        activeStudents,
        percentUsed: school.maxStudents
          ? Math.min(
              100,
              Math.round((activeStudents / school.maxStudents) * 100),
            )
          : 0,
      },
    });
  } catch (err) {
    console.error("Get tier status error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load tier status" });
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
  initiateSubscriptionPayment,
  getSubscriptionPaymentStatus,
  getOnboardingStatus,
};
