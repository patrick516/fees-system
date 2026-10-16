// backend/src/middleware/platformAuth.js
const jwt = require("jsonwebtoken");
const prisma = require("../config/db");

const verifyPlatformAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const token = authHeader.slice(7);
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired token." });
    }

    if (decoded.type !== "PLATFORM_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "This endpoint is for platform admins only.",
      });
    }

    const admin = await prisma.platformAdmin.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        platformId: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
      },
    });

    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid token or account deactivated.",
      });
    }

    req.platformAdmin = admin;
    req.platformId = admin.platformId;
    next();
  } catch (err) {
    console.error("Platform auth middleware error:", err);
    return res.status(500).json({ success: false, message: "Auth failed" });
  }
};

const requireOwner = (req, res, next) => {
  if (req.platformAdmin?.role !== "OWNER") {
    return res.status(403).json({
      success: false,
      message: "Only the platform owner can perform this action.",
    });
  }
  next();
};

module.exports = { verifyPlatformAdmin, requireOwner };
