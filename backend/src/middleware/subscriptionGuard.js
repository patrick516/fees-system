// backend/src/middleware/subscriptionGuard.js
const jwt = require("jsonwebtoken");
const prisma = require("../config/db");

// 🎯 Paths that should NEVER go through the subscription check.
// These are public endpoints: marketing site, owner portal, auth, webhooks.
const PUBLIC_PATH_PREFIXES = [
  "/api/auth", // login, signup, refresh, forgot, verify
  "/api/platform", // owner portal (has its own auth)
  "/api/school-requests", // marketing "book a demo" form
  "/api/schools/tiers", // public pricing for marketing site
  "/api/schools/public", // public branding
  "/api/schools/by-slug", // public branded login
  "/api/schools/lookup-by-email", // public login preview
  "/api/schools/payment-info", // parent portal payment info
  "/api/payments/onekhusa/webhook", // external webhook (no auth possible)
  "/api/parent/support", // parent portal support (has its own auth)
];

const requireActiveSubscription = async (req, res, next) => {
  try {
    // 🎯 1. Skip preflight
    if (req.method === "OPTIONS") return next();

    // 🎯 2. Skip known public paths
    const path = req.originalUrl || req.path || "";
    if (PUBLIC_PATH_PREFIXES.some((p) => path.startsWith(p))) {
      return next();
    }

    let schoolId = req.schoolId;

    // 3. If schoolId isn't set yet, try to decode it from the JWT
    if (!schoolId && req.headers.authorization) {
      const token = req.headers.authorization.split(" ")[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        schoolId = decoded.schoolId;
      } catch (e) {
        // Token invalid — let the actual router handle the 401
        return next();
      }
    }

    // 4. Fail CLOSED only if we're on a protected path AND no schoolId
    if (!schoolId || typeof schoolId !== "string" || schoolId === "undefined") {
      return res.status(401).json({
        success: false,
        message: "Authentication required. No school context.",
      });
    }

    // 5. Now it's safe to query Prisma
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { subscriptionStatus: true },
    });

    if (!school) {
      return res
        .status(404)
        .json({ success: false, message: "School not found." });
    }

    if (
      school.subscriptionStatus === "LOCKED" ||
      school.subscriptionStatus === "SUSPENDED"
    ) {
      return res.status(403).json({
        success: false,
        message: "Your account is locked due to an expired subscription.",
        code: "SUBSCRIPTION_LOCKED",
      });
    }

    if (school.subscriptionStatus === "READONLY" && req.method !== "GET") {
      return res.status(403).json({
        success: false,
        message:
          "Your account is read-only. Please renew your subscription to make changes.",
        code: "SUBSCRIPTION_READONLY",
      });
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
