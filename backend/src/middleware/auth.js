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

module.exports = { verifyStaff, verifyParent };
