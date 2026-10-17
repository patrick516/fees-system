// backend/src/middleware/subscriptionGuard.js
const jwt = require("jsonwebtoken");
const prisma = require("../config/db");

const requireActiveSubscription = async (req, res, next) => {
  try {
    let schoolId = req.schoolId;

    // 1. If schoolId isn't set yet, try to decode it from the JWT
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

    // 2. 🚨 SAFETY CHECK: If we still don't have a valid string schoolId, skip the check
    // This prevents Prisma from throwing "id: undefined" errors
    if (!schoolId || typeof schoolId !== "string" || schoolId === "undefined") {
      return next();
    }

    // 3. Now it's safe to query Prisma
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { subscriptionStatus: true },
    });

    if (!school) return next(); // School not found, let the route handle the 404

    // Block everything if LOCKED or SUSPENDED
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

    // For READONLY, allow GET requests, but block POST/PUT/DELETE
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
    next(); // Don't crash the app, just let the request through
  }
};

module.exports = { requireActiveSubscription };
