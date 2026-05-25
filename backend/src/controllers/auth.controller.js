const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../config/db");

// ==================== HELPERS ====================

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ==================== STAFF AUTH ====================

// POST /api/auth/staff/login
const staffLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find staff by email
    const staff = await prisma.staff.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            logo: true,
            isActive: true,
          },
        },
      },
    });

    // Check if staff exists
    if (!staff) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check if account is active
    if (!staff.isActive) {
      return res.status(401).json({
        success: false,
        message:
          "Your account has been deactivated. Contact your administrator.",
      });
    }

    // Check if school is active
    if (!staff.school.isActive) {
      return res.status(401).json({
        success: false,
        message: "School account is inactive. Contact SchoolPay support.",
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, staff.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Update last login
    await prisma.staff.update({
      where: { id: staff.id },
      data: { lastLogin: new Date() },
    });

    // Generate token
    const token = generateToken({
      id: staff.id,
      schoolId: staff.schoolId,
      role: staff.role,
      type: "STAFF",
    });

    // Return response
    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        staff: {
          id: staff.id,
          fullName: staff.fullName,
          email: staff.email,
          phone: staff.phone,
          role: staff.role,
          avatar: staff.avatar,
          school: staff.school,
        },
      },
    });
  } catch (error) {
    console.error("Staff login error:", error);
    return res.status(500).json({
      success: false,
      message: "Login failed. Please try again.",
    });
  }
};

// GET /api/auth/staff/me
const getStaffProfile = async (req, res) => {
  try {
    const staff = await prisma.staff.findUnique({
      where: { id: req.staff.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
        lastLogin: true,
        school: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            logo: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: staff,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get profile",
    });
  }
};

// POST /api/auth/staff/change-password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    // Get staff with password
    const staff = await prisma.staff.findUnique({
      where: { id: req.staff.id },
    });

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, staff.passwordHash);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.staff.update({
      where: { id: req.staff.id },
      data: { passwordHash: newHash },
    });

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to change password",
    });
  }
};

// ==================== PARENT AUTH ====================

// POST /api/auth/parent/login-student-id
// Parent logs in using Student ID + Date of Birth
const parentLoginWithStudentId = async (req, res) => {
  try {
    const { studentCode, dateOfBirth } = req.body;

    if (!studentCode || !dateOfBirth) {
      return res.status(400).json({
        success: false,
        message: "Student ID and date of birth are required",
      });
    }

    // Find student by code
    const student = await prisma.student.findUnique({
      where: { studentCode: studentCode.toUpperCase().trim() },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            logo: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student ID not found. Please check and try again.",
      });
    }

    if (!student.isActive) {
      return res.status(401).json({
        success: false,
        message: "This student account is inactive. Contact the school.",
      });
    }

    // Verify date of birth
    const inputDOB = new Date(dateOfBirth);
    const studentDOB = new Date(student.dateOfBirth);

    const dobMatches =
      inputDOB.getFullYear() === studentDOB.getFullYear() &&
      inputDOB.getMonth() === studentDOB.getMonth() &&
      inputDOB.getDate() === studentDOB.getDate();

    if (!dobMatches) {
      return res.status(401).json({
        success: false,
        message: "Date of birth does not match our records.",
      });
    }

    // Generate parent token
    const token = generateToken({
      studentId: student.id,
      schoolId: student.schoolId,
      phone: student.parentPhone,
      type: "PARENT",
    });

    // Calculate fee summary
    const payments = await prisma.feePayment.findMany({
      where: {
        studentId: student.id,
        status: "VERIFIED",
      },
    });

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    return res.status(200).json({
      success: true,
      message: `Welcome! Viewing account for ${student.fullName}`,
      data: {
        token,
        student: {
          id: student.id,
          fullName: student.fullName,
          studentCode: student.studentCode,
          class: student.class.name,
          school: student.school,
          parentName: student.parentName,
          parentPhone: student.parentPhone,
          academicYear: student.academicYear,
          totalPaid,
        },
      },
    });
  } catch (error) {
    console.error("Parent login error:", error);
    return res.status(500).json({
      success: false,
      message: "Login failed. Please try again.",
    });
  }
};

// POST /api/auth/parent/request-otp
// Parent requests OTP via their phone number
const requestOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    // Clean phone number
    const cleanPhone = phone.replace(/\s/g, "").replace(/^0/, "+265");

    // Check if this phone belongs to any student
    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { parentPhone: cleanPhone },
          { parentPhone: phone },
          { parentPhone2: cleanPhone },
          { parentPhone2: phone },
        ],
        isActive: true,
      },
      include: {
        school: { select: { name: true } },
        class: { select: { name: true } },
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "No student found with this phone number. Contact the school.",
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing OTP for this phone
    await prisma.otpCode.deleteMany({
      where: { phone: cleanPhone },
    });

    // Save new OTP
    await prisma.otpCode.create({
      data: {
        phone: cleanPhone,
        code: otp,
        expiresAt,
      },
    });

    // TODO: Send OTP via Africa's Talking SMS
    // For now log to console in development
    if (process.env.NODE_ENV === "development") {
      console.log(`📱 OTP for ${cleanPhone}: ${otp}`);
    }

    return res.status(200).json({
      success: true,
      message: `Verification code sent to ${phone}`,
      // Only return OTP in development for testing
      ...(process.env.NODE_ENV === "development" && { otp }),
    });
  } catch (error) {
    console.error("Request OTP error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP. Please try again.",
    });
  }
};

// POST /api/auth/parent/verify-otp
const verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: "Phone number and OTP are required",
      });
    }

    const cleanPhone = phone.replace(/\s/g, "").replace(/^0/, "+265");

    // Find OTP record
    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        phone: cleanPhone,
        code: otp,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired code. Please request a new one.",
      });
    }

    // Mark OTP as used
    await prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });

    // Find student linked to this phone
    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { parentPhone: cleanPhone },
          { parentPhone: phone },
          { parentPhone2: cleanPhone },
        ],
        isActive: true,
      },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            logo: true,
          },
        },
        class: {
          select: { id: true, name: true },
        },
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found for this phone number.",
      });
    }

    // Generate token
    const token = generateToken({
      studentId: student.id,
      schoolId: student.schoolId,
      phone: cleanPhone,
      type: "PARENT",
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        student: {
          id: student.id,
          fullName: student.fullName,
          studentCode: student.studentCode,
          class: student.class.name,
          school: student.school,
          parentName: student.parentName,
          parentPhone: student.parentPhone,
          academicYear: student.academicYear,
        },
      },
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return res.status(500).json({
      success: false,
      message: "Verification failed. Please try again.",
    });
  }
};

module.exports = {
  staffLogin,
  getStaffProfile,
  changePassword,
  parentLoginWithStudentId,
  requestOTP,
  verifyOTP,
};
