const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const prisma = require("../config/db");
const { sendOtp, verifyOtp } = require("../lib/sms");
const { sendOtpEmail } = require("../lib/mailer");
const { validatePassword } = require("../lib/passwordPolicy");

// ==================== HELPERS ====================

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

const generateOtp = () => String(crypto.randomInt(100000, 999999));

const slugify = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

// ==================== STAFF AUTH ====================

// POST /api/auth/staff/login
const staffLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const staff = await prisma.staff.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        department: { select: { id: true, name: true } },
        school: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            logo: true,
            motto: true,
            primaryColor: true,
            isActive: true,
          },
        },
      },
    });

    if (!staff || !staff.passwordHash) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!staff.isActive) {
      return res.status(401).json({
        success: false,
        message:
          "Your account has been deactivated. Contact your administrator.",
      });
    }

    if (!staff.school.isActive) {
      return res.status(401).json({
        success: false,
        message: "School account is inactive. Contact SchoolPay support.",
      });
    }

    // NEW: block login until email is verified
    if (!staff.emailVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in",
        code: "EMAIL_NOT_VERIFIED",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, staff.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    await prisma.staff.update({
      where: { id: staff.id },
      data: { lastLogin: new Date() },
    });

    const token = generateToken({
      id: staff.id,
      schoolId: staff.schoolId,
      role: staff.role,
      type: "STAFF",
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        // NEW: flag frontend to force password change
        mustChangePassword: staff.mustChangePassword,
        staff: {
          id: staff.id,
          fullName: staff.fullName,
          email: staff.email,
          phone: staff.phone,
          role: staff.role,
          avatar: staff.avatar,
          department: staff.department,
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
        mustChangePassword: true,
        emailVerified: true,
        department: { select: { id: true, name: true } },
        school: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            logo: true,
            motto: true,
            primaryColor: true,
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

    // UPGRADED: use shared strong password policy
    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.valid) {
      return res.status(400).json({
        success: false,
        message: "Password does not meet policy",
        errors: pwCheck.errors,
      });
    }

    const staff = await prisma.staff.findUnique({
      where: { id: req.staff.id },
    });

    const isValid = await bcrypt.compare(currentPassword, staff.passwordHash);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const same = await bcrypt.compare(newPassword, staff.passwordHash);
    if (same) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password",
      });
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    await prisma.staff.update({
      where: { id: req.staff.id },
      data: {
        passwordHash: newHash,
        // NEW: clears the forced-change flag after a successful change
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      },
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

// POST /api/auth/register
const registerAdmin = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      password,
      schoolName,
      address,
      city,
      schoolPhone,
    } = req.body;
    // Block registration if a school already exists — setup is one-time only
    const existingSchoolCount = await prisma.school.count();
    if (existingSchoolCount > 0) {
      return res.status(403).json({
        success: false,
        message:
          "Setup is already complete. Please contact your school administrator.",
        code: "SETUP_ALREADY_COMPLETE",
      });
    }

    if (
      !fullName ||
      !email ||
      !phone ||
      !password ||
      !schoolName ||
      !address ||
      !city ||
      !schoolPhone
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
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

    const existingStaff = await prisma.staff.findUnique({ where: { email } });
    if (existingStaff) {
      return res
        .status(409)
        .json({ success: false, message: "Email already registered" });
    }

    // Ensure platform record
    let platform = await prisma.platform.findFirst();
    if (!platform) {
      platform = await prisma.platform.create({
        data: {
          email: process.env.BREVO_SENDER_EMAIL || "admin@schoolpay.mw",
          phone: "+265000000000",
        },
      });
    }

    // Unique slug
    let slug = slugify(schoolName);
    const slugExists = await prisma.school.findUnique({ where: { slug } });
    if (slugExists) slug = `${slug}-${Date.now().toString(36)}`;

    const passwordHash = await bcrypt.hash(password, 12);
    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    const result = await prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          platformId: platform.id,
          name: schoolName,
          slug,
          address,
          city,
          phone: schoolPhone,
          email,
        },
      });

      const admin = await tx.staff.create({
        data: {
          schoolId: school.id,
          fullName,
          email,
          phone,
          passwordHash,
          role: "SCHOOL_ADMIN",
          emailVerified: false,
          emailVerificationOtp: otpHash,
          emailVerificationExpires: new Date(Date.now() + OTP_TTL_MS),
        },
      });

      return { school, admin };
    });

    await sendOtpEmail({
      to: email,
      name: fullName,
      otp,
      purpose: "verify your SchoolPay admin account",
    });

    return res.status(201).json({
      success: true,
      message: "Account created. Check your email for the verification code.",
      data: { email: result.admin.email, schoolId: result.school.id },
    });
  } catch (err) {
    console.error("Register admin error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Registration failed" });
  }
};

// POST /api/auth/verify-email
const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Email and OTP required" });
    }

    const staff = await prisma.staff.findUnique({ where: { email } });
    if (!staff)
      return res
        .status(404)
        .json({ success: false, message: "Account not found" });
    if (staff.emailVerified)
      return res
        .status(400)
        .json({ success: false, message: "Email already verified" });
    if (!staff.emailVerificationOtp || !staff.emailVerificationExpires) {
      return res.status(400).json({
        success: false,
        message: "No OTP pending. Request a new one.",
      });
    }
    if (staff.emailVerificationExpires < new Date()) {
      return res
        .status(400)
        .json({ success: false, message: "OTP expired. Request a new one." });
    }

    const matches = await bcrypt.compare(
      String(otp),
      staff.emailVerificationOtp,
    );
    if (!matches) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    await prisma.staff.update({
      where: { id: staff.id },
      data: {
        emailVerified: true,
        emailVerificationOtp: null,
        emailVerificationExpires: null,
      },
    });

    return res
      .status(200)
      .json({ success: true, message: "Email verified. You can now log in." });
  } catch (err) {
    console.error("Verify email error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Verification failed" });
  }
};

// POST /api/auth/resend-otp
const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const staff = await prisma.staff.findUnique({ where: { email } });
    if (!staff)
      return res
        .status(404)
        .json({ success: false, message: "Account not found" });
    if (staff.emailVerified)
      return res
        .status(400)
        .json({ success: false, message: "Already verified" });

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    await prisma.staff.update({
      where: { id: staff.id },
      data: {
        emailVerificationOtp: otpHash,
        emailVerificationExpires: new Date(Date.now() + OTP_TTL_MS),
      },
    });

    await sendOtpEmail({ to: email, name: staff.fullName, otp });
    return res.status(200).json({ success: true, message: "OTP resent" });
  } catch (err) {
    console.error("Resend OTP error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to resend OTP" });
  }
};

// ==================== INVITATION ACCEPT (NEW) ====================

// POST /api/auth/accept-invitation
const acceptInvitation = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ success: false, message: "Token and password required" });
    }

    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.valid) {
      return res.status(400).json({
        success: false,
        message: "Password too weak",
        errors: pwCheck.errors,
      });
    }

    const staff = await prisma.staff.findFirst({
      where: { invitationToken: token },
      include: { school: true },
    });
    if (!staff)
      return res
        .status(404)
        .json({ success: false, message: "Invalid invitation" });
    if (!staff.invitationExpires || staff.invitationExpires < new Date()) {
      return res
        .status(400)
        .json({ success: false, message: "Invitation expired" });
    }

    await prisma.staff.update({
      where: { id: staff.id },
      data: {
        passwordHash: await bcrypt.hash(newPassword, 12),
        invitationToken: null,
        invitationExpires: null,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
        emailVerified: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Invitation accepted. You can log in now.",
    });
  } catch (err) {
    console.error("Accept invitation error:", err);
    return res.status(500).json({ success: false, message: "Accept failed" });
  }
};

// GET /api/auth/me — richer profile for new frontend
const getMe = async (req, res) => {
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
        mustChangePassword: true,
        department: { select: { id: true, name: true } },
        school: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            primaryColor: true,
          },
        },
      },
    });
    return res.status(200).json({ success: true, data: staff });
  } catch (err) {
    console.error("Get me error:", err);
    return res.status(500).json({ success: false, message: "Failed" });
  }
};
// GET /api/auth/setup-status
// Public — tells the frontend whether signup is still allowed
const getSetupStatus = async (req, res) => {
  try {
    const schoolCount = await prisma.school.count();
    const setupComplete = schoolCount > 0;

    let schoolName;
    if (setupComplete) {
      const school = await prisma.school.findFirst({
        select: { name: true },
      });
      schoolName = school?.name;
    }

    return res.status(200).json({
      success: true,
      data: { setupComplete, schoolName },
    });
  } catch (err) {
    console.error("Setup status error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to check setup status" });
  }
};

// ==================== PARENT AUTH (UNCHANGED) ====================

// POST /api/auth/parent/login-student-id
const parentLoginWithStudentId = async (req, res) => {
  try {
    const { studentCode, dateOfBirth } = req.body;

    if (!studentCode || !dateOfBirth) {
      return res.status(400).json({
        success: false,
        message: "Student ID and date of birth are required",
      });
    }

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
            motto: true,
            primaryColor: true,
          },
        },
        class: { select: { id: true, name: true } },
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

    const token = generateToken({
      studentId: student.id,
      schoolId: student.schoolId,
      phone: student.parentPhone,
      type: "PARENT",
    });

    const payments = await prisma.feePayment.findMany({
      where: { studentId: student.id, status: "VERIFIED" },
    });
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    return res.status(200).json({
      success: true,
      message: `Welcome! Viewing account for ${student.fullName}`,
      data: {
        token,
        student: {
          id: student.id,
          firstName: student.firstName,
          middleName: student.middleName,
          lastName: student.lastName,
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
const requestOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res
        .status(400)
        .json({ success: false, message: "Phone number is required" });
    }

    const cleanPhone = phone.replace(/\s/g, "").replace(/^0/, "+265");

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

    const { otpId, expiresAt } = await sendOtp(cleanPhone);

    await prisma.otpCode.deleteMany({ where: { phone: cleanPhone } });

    await prisma.otpCode.create({
      data: {
        phone: cleanPhone,
        code: otpId,
        expiresAt: new Date(expiresAt),
      },
    });

    return res.status(200).json({
      success: true,
      message: `Verification code sent to ${phone}`,
    });
  } catch (error) {
    console.error("Request OTP error:", error.message);
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

    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        phone: cleanPhone,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired code. Please request a new one.",
      });
    }

    let verified = false;
    try {
      const result = await verifyOtp(otpRecord.code, otp);
      verified = result.verified;
    } catch (verifyErr) {
      console.error("TumaSend verify error:", verifyErr.message);
    }

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired code. Please request a new one.",
      });
    }

    await prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });

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
            motto: true,
            primaryColor: true,
          },
        },
        class: { select: { id: true, name: true } },
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found for this phone number.",
      });
    }

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
          firstName: student.firstName,
          middleName: student.middleName,
          lastName: student.lastName,
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
  registerAdmin,
  verifyEmail,
  resendOtp,
  acceptInvitation,
  getMe,
  getSetupStatus,
  parentLoginWithStudentId,
  requestOTP,
  verifyOTP,
};
