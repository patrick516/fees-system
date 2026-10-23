const jwt = require("jsonwebtoken");
const prisma = require("../config/db");

const requireActiveSubscription = async (req, res, next) => {
  try {
    let schoolId = req.schoolId;

    if (!schoolId && req.headers.authorization) {
      const token = req.headers.authorization.split(" ")[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        schoolId = decoded.schoolId;
      } catch (e) {
        //  FIX: Fail CLOSED instead of passing
        return res
          .status(401)
          .json({ success: false, message: "Invalid or expired token." });
      }
    }

    //  FIX: Fail CLOSED if no schoolId
    if (!schoolId || typeof schoolId !== "string" || schoolId === "undefined") {
      return res.status(401).json({
        success: false,
        message: "Authentication required. No school context.",
      });
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { subscriptionStatus: true },
    });

    //  FIX: Fail CLOSED if school not found
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
    //  FIX: Fail CLOSED on DB errors
    return res.status(500).json({
      success: false,
      message: "Internal server error verifying subscription.",
    });
  }
};

module.exports = { requireActiveSubscription };
