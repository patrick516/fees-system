const jwt = require("jsonwebtoken");
const prisma = require("../config/db");

// Verify JWT token for staff
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

    // Get staff from database
    const staff = await prisma.staff.findUnique({
      where: { id: decoded.id },
      include: { school: true },
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
        role: true,
        email: true,
        fullName: true,
        isActive: true,
        mustChangePassword: true,
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

    // Block everything except change-password if user must change password
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
// Verify parent session (simpler - uses studentId stored in token)
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

    // Get student to confirm still exists
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

// Accepts EITHER a staff token OR a parent token.
// Populates req.schoolId in both cases so school-scoped reads work for both roles.
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
      include: { school: true },
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
