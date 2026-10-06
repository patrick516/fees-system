// backend/src/middleware/auth.js
const jwt = require("jsonwebtoken");
const prisma = require("../config/db");

// ==================== STAFF AUTH ====================
const verifyStaff = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Load staff with role + school (role is now a relation)
    const staff = await prisma.staff.findUnique({
      where: { id: decoded.id },
      include: {
        role: { select: { id: true, name: true, permissions: true } },
        school: true,
      },
    });

    if (!staff || !staff.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid token or account deactivated.",
      });
    }

    req.staff = staff;
    req.schoolId = staff.schoolId;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

// ==================== GENERIC AUTHENTICATE ====================
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }
    const token = authHeader.slice(7);

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    const staff = await prisma.staff.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        schoolId: true,
        email: true,
        fullName: true,
        isActive: true,
        mustChangePassword: true,
        role: { select: { id: true, name: true, permissions: true } },
      },
    });

    if (!staff)
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    if (!staff.isActive)
      return res
        .status(403)
        .json({ success: false, message: "Account deactivated" });

    if (staff.mustChangePassword) {
      const allowedPaths = [
        "/api/auth/change-password",
        "/api/auth/me",
        "/api/auth/logout",
      ];
      if (
        !allowedPaths.includes(req.path) &&
        !req.path.startsWith("/api/auth/change-password")
      ) {
        return res.status(403).json({
          success: false,
          message: "You must change your password before continuing",
          code: "MUST_CHANGE_PASSWORD",
        });
      }
    }

    req.staff = staff;
    req.schoolId = staff.schoolId;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(500).json({ success: false, message: "Auth failed" });
  }
};

// ==================== PARENT AUTH ====================
const verifyParent = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Please login first.",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== "PARENT") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Parent access only.",
      });
    }

    const student = await prisma.student.findUnique({
      where: { id: decoded.studentId },
      include: { school: true, class: true },
    });

    if (!student || !student.isActive) {
      return res.status(401).json({
        success: false,
        message: "Student not found or inactive.",
      });
    }

    req.student = student;
    req.parentPhone = decoded.phone;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired session. Please login again.",
    });
  }
};

// ==================== STAFF OR PARENT ====================
const verifyStaffOrParent = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Parent path
    if (decoded.type === "PARENT") {
      const student = await prisma.student.findUnique({
        where: { id: decoded.studentId },
        include: { school: true, class: true },
      });

      if (!student || !student.isActive) {
        return res.status(401).json({
          success: false,
          message: "Student not found or inactive.",
        });
      }

      req.student = student;
      req.parentPhone = decoded.phone;
      req.schoolId = student.schoolId;
      req.userType = "PARENT";
      return next();
    }

    // Staff path
    const staff = await prisma.staff.findUnique({
      where: { id: decoded.id },
      include: {
        role: { select: { id: true, name: true, permissions: true } },
        school: true,
      },
    });

    if (!staff || !staff.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid token or account deactivated.",
      });
    }

    req.staff = staff;
    req.schoolId = staff.schoolId;
    req.userType = "STAFF";
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

module.exports = {
  authenticate,
  verifyStaff,
  verifyParent,
  verifyStaffOrParent,
};
