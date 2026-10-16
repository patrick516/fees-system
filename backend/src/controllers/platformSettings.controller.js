// backend/src/controllers/platformSettings.controller.js
const prisma = require("../config/db");

// ==================== GET SETTINGS ====================
// GET /api/platform/settings
const getSettings = async (req, res) => {
  try {
    const platform = await prisma.platform.findFirst({
      where: { id: req.platformId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        currency: true,
        defaultTermPrice: true,
        defaultTrialDays: true,
        subscriptionMerchantAccount: true,
        subscriptionWebhookSecretSuccess: true,
        subscriptionWebhookSecretReversed: true,
      },
    });

    if (!platform) {
      return res
        .status(404)
        .json({ success: false, message: "Platform not found" });
    }

    // Never return raw secrets — send booleans instead
    return res.json({
      success: true,
      data: {
        id: platform.id,
        name: platform.name,
        email: platform.email,
        phone: platform.phone,
        currency: platform.currency,
        defaultTermPrice: platform.defaultTermPrice,
        defaultTrialDays: platform.defaultTrialDays,
        subscriptionMerchantAccount: platform.subscriptionMerchantAccount,
        hasSubscriptionSecretSuccess:
          !!platform.subscriptionWebhookSecretSuccess,
        hasSubscriptionSecretReversed:
          !!platform.subscriptionWebhookSecretReversed,
      },
    });
  } catch (err) {
    console.error("getSettings (platform) error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load settings" });
  }
};

// ==================== UPDATE SETTINGS ====================
// PUT /api/platform/settings
const updateSettings = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      currency,
      defaultTermPrice,
      defaultTrialDays,
      subscriptionMerchantAccount,
      subscriptionWebhookSecretSuccess,
      subscriptionWebhookSecretReversed,
    } = req.body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (phone !== undefined) data.phone = phone;
    if (currency !== undefined) data.currency = currency;
    if (defaultTermPrice !== undefined)
      data.defaultTermPrice = Number(defaultTermPrice) || 0;
    if (defaultTrialDays !== undefined)
      data.defaultTrialDays = Math.max(0, Number(defaultTrialDays) || 0);
    if (subscriptionMerchantAccount !== undefined)
      data.subscriptionMerchantAccount =
        subscriptionMerchantAccount?.toString().trim() || null;

    // Secrets: only overwrite if a non-empty value was sent.
    // Empty string means "leave as-is" (so the UI can show masked dots)
    if (
      subscriptionWebhookSecretSuccess &&
      subscriptionWebhookSecretSuccess.trim()
    ) {
      data.subscriptionWebhookSecretSuccess =
        subscriptionWebhookSecretSuccess.trim();
    }
    if (
      subscriptionWebhookSecretReversed &&
      subscriptionWebhookSecretReversed.trim()
    ) {
      data.subscriptionWebhookSecretReversed =
        subscriptionWebhookSecretReversed.trim();
    }

    const updated = await prisma.platform.update({
      where: { id: req.platformId },
      data,
    });

    return res.json({
      success: true,
      message: "Platform settings saved",
      data: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        currency: updated.currency,
        defaultTermPrice: updated.defaultTermPrice,
        defaultTrialDays: updated.defaultTrialDays,
        subscriptionMerchantAccount: updated.subscriptionMerchantAccount,
        hasSubscriptionSecretSuccess:
          !!updated.subscriptionWebhookSecretSuccess,
        hasSubscriptionSecretReversed:
          !!updated.subscriptionWebhookSecretReversed,
      },
    });
  } catch (err) {
    console.error("updateSettings (platform) error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to save settings" });
  }
};

module.exports = { getSettings, updateSettings };
