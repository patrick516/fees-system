// backend/src/controllers/platformAuth.controller.js
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const prisma = require("../config/db");
const { validatePassword } = require("../lib/passwordPolicy");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  compareToken,
  getRefreshExpiryDate,
} = require("../lib/tokens");

const MAX_ATTEMPTS = parseInt(process.env.LOGIN_MAX_ATTEMPTS || "3", 10);
const LOCKOUT_HOURS = parseInt(process.env.LOGIN_LOCKOUT_HOURS || "2", 10);

const checkLockStatus = (admin) => {
  if (!admin?.lockedUntil) {
    return { locked: false, minutesRemaining: 0 };
  }
  const now = Date.now();
  const until = new Date(admin.lockedUntil).getTime();
  if (until <= now) return { locked: false, minutesRemaining: 0 };
  return {
    locked: true,
    minutesRemaining: Math.ceil((until - now) / 60000),
  };
};

// ==================== SETUP STATUS (public) ====================
// GET /api/platform/setup-status
// Tells the frontend whether the platform has been initialized.
const getSetupStatus = async (req, res) => {
  try {
    const count = await prisma.platformAdmin.count();
    return res.json({
      success: true,
      data: { setupComplete: count > 0 },
    });
  } catch (err) {
    console.error("Platform setup-status error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to check setup status" });
  }
};

// ==================== INITIAL SETUP (public, one-time only) ====================
// POST /api/platform/setup
// Creates the first OWNER. Refuses if any platform admin already exists.
const setupOwner = async (req, res) => {
  try {
    const existing = await prisma.platformAdmin.count();
    if (existing > 0) {
      return res.status(403).json({
        success: false,
        message: "Platform is already set up.",
        code: "SETUP_ALREADY_COMPLETE",
      });
    }

    const { fullName, email, phone, password } = req.body;

    if (!fullName || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "fullName, email, phone and password are required",
      });
    }

    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      return res.status(400).json({
        success: false,
        message: "Password does not meet policy",
        errors: pwCheck.errors,
      });
    }

    // Ensure a Platform record exists
    let platform = await prisma.platform.findFirst();
    if (!platform) {
      platform = await prisma.platform.create({
        data: {
          email,
          phone,
        },
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const admin = await prisma.platformAdmin.create({
      data: {
        platformId: platform.id,
        fullName,
        email: email.toLowerCase().trim(),
        phone,
        passwordHash,
        role: "OWNER",
        emailVerified: true, // initial owner is verified by definition
      },
    });

    return res.status(201).json({
      success: true,
      message: "Platform owner created. You can now log in.",
      data: { id: admin.id, email: admin.email },
    });
  } catch (err) {
    console.error("Platform setup error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to set up platform" });
  }
};

// ==================== LOGIN ====================
// POST /api/platform/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const admin = await prisma.platformAdmin.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!admin || !admin.passwordHash) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    const lock = checkLockStatus(admin);
    if (lock.locked) {
      return res.status(423).json({
        success: false,
        code: "ACCOUNT_LOCKED",
        message: `Account locked. Try again in ${lock.minutesRemaining} minute${lock.minutesRemaining === 1 ? "" : "s"}.`,
        minutesRemaining: lock.minutesRemaining,
      });
    }

    if (!admin.isActive) {
      return res
        .status(403)
        .json({ success: false, message: "Account deactivated" });
    }

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) {
      const newAttempts = (admin.failedLoginAttempts || 0) + 1;
      const shouldLock = newAttempts >= MAX_ATTEMPTS;
      const lockedUntil = shouldLock
        ? new Date(Date.now() + LOCKOUT_HOURS * 60 * 60 * 1000)
        : null;

      await prisma.platformAdmin.update({
        where: { id: admin.id },
        data: {
          failedLoginAttempts: newAttempts,
          lockedUntil,
        },
      });

      if (shouldLock) {
        return res.status(423).json({
          success: false,
          code: "ACCOUNT_LOCKED",
          message: `Too many failed attempts. Locked for ${LOCKOUT_HOURS} hour${LOCKOUT_HOURS === 1 ? "" : "s"}.`,
          minutesRemaining: LOCKOUT_HOURS * 60,
        });
      }

      const left = MAX_ATTEMPTS - newAttempts;
      return res.status(401).json({
        success: false,
        message: `Invalid email or password. ${left} attempt${left === 1 ? "" : "s"} remaining.`,
      });
    }

    // Success — issue tokens
    const accessToken = signAccessToken({
      id: admin.id,
      platformId: admin.platformId,
      role: admin.role,
      type: "PLATFORM_ADMIN",
    });
    const refreshToken = signRefreshToken(admin.id, "PLATFORM_REFRESH");
    const refreshTokenHash = await hashToken(refreshToken);

    await prisma.platformAdmin.update({
      where: { id: admin.id },
      data: {
        lastLogin: new Date(),
        refreshTokenHash,
        refreshTokenExpires: getRefreshExpiryDate(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    return res.json({
      success: true,
      message: "Login successful",
      data: {
        token: accessToken,
        refreshToken,
        mustChangePassword: admin.mustChangePassword,
        admin: {
          id: admin.id,
          fullName: admin.fullName,
          email: admin.email,
          phone: admin.phone,
          role: admin.role,
          avatar: admin.avatar,
        },
      },
    });
  } catch (err) {
    console.error("Platform login error:", err);
    return res.status(500).json({ success: false, message: "Login failed" });
  }
};

// ==================== REFRESH ====================
// POST /api/platform/auth/refresh
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res
        .status(400)
        .json({ success: false, message: "Refresh token required" });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken, "PLATFORM_REFRESH");
    } catch {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
        code: "REFRESH_EXPIRED",
      });
    }

    const admin = await prisma.platformAdmin.findUnique({
      where: { id: decoded.id },
    });

    if (!admin || !admin.isActive || !admin.refreshTokenHash) {
      return res.status(401).json({
        success: false,
        message: "Session not found",
        code: "REFRESH_EXPIRED",
      });
    }

    if (admin.refreshTokenExpires < new Date()) {
      return res.status(401).json({
        success: false,
        message: "Session expired",
        code: "REFRESH_EXPIRED",
      });
    }

    const matches = await compareToken(refreshToken, admin.refreshTokenHash);
    if (!matches) {
      return res.status(401).json({
        success: false,
        message: "Session no longer valid",
        code: "REFRESH_EXPIRED",
      });
    }

    const newAccess = signAccessToken({
      id: admin.id,
      platformId: admin.platformId,
      role: admin.role,
      type: "PLATFORM_ADMIN",
    });
    const newRefresh = signRefreshToken(admin.id, "PLATFORM_REFRESH");
    const newHash = await hashToken(newRefresh);

    await prisma.platformAdmin.update({
      where: { id: admin.id },
      data: {
        refreshTokenHash: newHash,
        refreshTokenExpires: getRefreshExpiryDate(),
      },
    });

    return res.json({
      success: true,
      data: { token: newAccess, refreshToken: newRefresh },
    });
  } catch (err) {
    console.error("Platform refresh error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to refresh session" });
  }
};

// ==================== LOGOUT ====================
// POST /api/platform/auth/logout
const logout = async (req, res) => {
  try {
    if (req.platformAdmin?.id) {
      await prisma.platformAdmin.update({
        where: { id: req.platformAdmin.id },
        data: { refreshTokenHash: null, refreshTokenExpires: null },
      });
    }
    return res.json({ success: true, message: "Logged out" });
  } catch (err) {
    console.error("Platform logout error:", err);
    return res.json({ success: true, message: "Logged out" });
  }
};

// ==================== GET ME ====================
// GET /api/platform/auth/me
const getMe = async (req, res) => {
  try {
    const admin = await prisma.platformAdmin.findUnique({
      where: { id: req.platformAdmin.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
        lastLogin: true,
        platform: {
          select: {
            id: true,
            name: true,
            defaultTermPrice: true,
            defaultTrialDays: true,
            currency: true,
          },
        },
      },
    });
    return res.json({ success: true, data: admin });
  } catch (err) {
    console.error("Platform getMe error:", err);
    return res.status(500).json({ success: false, message: "Failed" });
  }
};

module.exports = {
  getSetupStatus,
  setupOwner,
  login,
  refresh,
  logout,
  getMe,
};