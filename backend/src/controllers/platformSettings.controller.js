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
        tiers: true, // 🎯 BUG 1 FIX: must select tiers to return them
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
        tiers: platform.tiers || [],
        subscriptionWebhookSecretSuccess:
          platform.subscriptionWebhookSecretSuccess || "",
        subscriptionWebhookSecretReversed:
          platform.subscriptionWebhookSecretReversed || "",
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
      tiers, // 🎯 BUG 2 FIX: must destructure tiers
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

    // 🎯 Tiers: must be an array
    if (tiers !== undefined) {
      if (!Array.isArray(tiers)) {
        return res.status(400).json({
          success: false,
          message: "Tiers must be an array of tier objects",
        });
      }
      data.tiers = tiers;
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
        tiers: updated.tiers || [],
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
