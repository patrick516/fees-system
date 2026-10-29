// backend/src/middleware/subscriptionGuard.js
const jwt = require("jsonwebtoken");
const prisma = require("../config/db");
const { computeAutoStatus } = require("../lib/subscription");

//  Paths that should NEVER go through the subscription check
const PUBLIC_PATH_PREFIXES = [
  "/api/auth",
  "/api/platform",
  "/api/school-requests",
  "/api/schools/tiers",
  "/api/schools/public",
  "/api/schools/by-slug",
  "/api/schools/lookup-by-email",
  "/api/schools/payment-info",
  "/api/payments/onekhusa/webhook",
  "/api/parent/support",
];

const requireActiveSubscription = async (req, res, next) => {
  try {
    if (req.method === "OPTIONS") return next();

    const path = req.originalUrl || req.path || "";
    if (PUBLIC_PATH_PREFIXES.some((p) => path.startsWith(p))) {
      return next();
    }

    let schoolId = req.schoolId;

    if (!schoolId && req.headers.authorization) {
      const token = req.headers.authorization.split(" ")[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        schoolId = decoded.schoolId;
      } catch (e) {
        return next();
      }
    }

    if (!schoolId || typeof schoolId !== "string" || schoolId === "undefined") {
      return res.status(401).json({
        success: false,
        message: "Authentication required. No school context.",
      });
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        subscriptionEndsAt: true,
        isActive: true,
      },
    });

    if (!school) {
      return res
        .status(404)
        .json({ success: false, message: "School not found." });
    }

    // 🎯 Compute the EFFECTIVE status based on dates — not the static DB field
    const effectiveStatus = school.isActive
      ? computeAutoStatus(school)
      : "SUSPENDED";

    // 🎯 If the DB field has drifted from reality, silently fix it
    if (effectiveStatus !== school.subscriptionStatus) {
      prisma.school
        .update({
          where: { id: school.id },
          data: { subscriptionStatus: effectiveStatus },
        })
        .catch((e) =>
          console.error(
            "[subscriptionGuard] Auto-sync status failed:",
            e.message,
          ),
        );
    }

    if (effectiveStatus === "LOCKED" || effectiveStatus === "SUSPENDED") {
      res.setHeader("X-Subscription-Status", effectiveStatus);
      return res.status(403).json({
        success: false,
        message:
          "Your subscription has expired. Please contact SchoolPay support to renew.",
        code: "SUBSCRIPTION_LOCKED",
      });
    }

    if (effectiveStatus === "READONLY" && req.method !== "GET") {
      res.setHeader("X-Subscription-Status", effectiveStatus);
      return res.status(403).json({
        success: false,
        message:
          "Your account is in read-only mode. Please renew your subscription to make changes.",
        code: "SUBSCRIPTION_READONLY",
      });
    }

    // Attach to req so downstream controllers know the real status
    req.effectiveSubscriptionStatus = effectiveStatus;

    //  Send it back to the frontend so it can react in real time
    res.setHeader("X-Subscription-Status", effectiveStatus);
    const daysLeft = require("../lib/subscription").getDaysRemaining(school);
    if (daysLeft !== null) {
      res.setHeader("X-Subscription-Days-Left", String(daysLeft));
    }

    next();
  } catch (err) {
    console.error("[subscriptionGuard] Error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error verifying subscription.",
    });
  }
};

module.exports = { requireActiveSubscription };
