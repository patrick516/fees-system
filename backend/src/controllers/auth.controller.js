const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const prisma = require("../config/db");
const { sendOtp, verifyOtp } = require("../lib/sms");
const { sendOtpEmail, sendPasswordResetEmail } = require("../lib/mailer");
const { validatePassword } = require("../lib/passwordPolicy");
const { createDefaultRolesForSchool } = require("../lib/defaultRoles");

const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  compareToken,
  getRefreshExpiryDate,
} = require("../lib/tokens");
const { logAudit } = require("../lib/audit");

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

// Merge title + firstName + lastName into a single display name.
// Returns "" if firstName or lastName is missing.
const buildFullName = (title, firstName, lastName) =>
  [title, firstName, lastName]
    .filter((p) => p && String(p).trim())
    .map((p) => String(p).trim())
    .join(" ");

// Login lockout config
const MAX_ATTEMPTS = parseInt(process.env.LOGIN_MAX_ATTEMPTS || "3", 10);
const LOCKOUT_HOURS = parseInt(process.env.LOGIN_LOCKOUT_HOURS || "2", 10);

// Returns { locked: boolean, minutesRemaining: number, lockedUntil: Date|null }
const checkLockStatus = (staff) => {
  if (!staff?.lockedUntil) {
    return { locked: false, minutesRemaining: 0, lockedUntil: null };
  }
  const now = Date.now();
  const until = new Date(staff.lockedUntil).getTime();
  if (until <= now) {
    return { locked: false, minutesRemaining: 0, lockedUntil: null };
  }
  const minutesRemaining = Math.ceil((until - now) / 60000);
  return { locked: true, minutesRemaining, lockedUntil: staff.lockedUntil };
};
//  STAFF AUTH

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
        role: true,
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
            subscriptionStatus: true,
            trialEndsAt: true,
            subscriptionEndsAt: true,
          },
        },
      },
    });

    // If no account or no password, treat as invalid (don't reveal which)
    if (!staff || !staff.passwordHash) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // ============ LOCKOUT CHECK ============
    const lock = checkLockStatus(staff);
    if (lock.locked) {
      return res.status(423).json({
        success: false,
        code: "ACCOUNT_LOCKED",
        message: `Account locked due to too many failed login attempts. Try again in ${lock.minutesRemaining} minute${lock.minutesRemaining === 1 ? "" : "s"}.`,
        lockedUntil: lock.lockedUntil,
        minutesRemaining: lock.minutesRemaining,
      });
    }

    // ============ OTHER BLOCKING CHECKS ============
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

    if (!staff.emailVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in",
        code: "EMAIL_NOT_VERIFIED",
      });
    }

    // ============ PASSWORD CHECK ============
    const isPasswordValid = await bcrypt.compare(password, staff.passwordHash);

    if (!isPasswordValid) {
      // Increment failed attempts
      const newAttempts = (staff.failedLoginAttempts || 0) + 1;
      const shouldLock = newAttempts >= MAX_ATTEMPTS;
      const lockedUntil = shouldLock
        ? new Date(Date.now() + LOCKOUT_HOURS * 60 * 60 * 1000)
        : null;

      await prisma.staff.update({
        where: { id: staff.id },
        data: {
          failedLoginAttempts: newAttempts,
          lockedUntil,
        },
      });

      await logAudit(req, {
        action: shouldLock ? "ACCOUNT_LOCKED" : "LOGIN_FAILED",
        entity: "Session",
        targetName: staff.fullName,
        status: "FAILED",
        changes: {
          reason: "Wrong password",
          attempt: newAttempts,
          lockedUntil: lockedUntil?.toISOString() || null,
        },
        actor: staff,
      });

      if (shouldLock) {
        return res.status(423).json({
          success: false,
          code: "ACCOUNT_LOCKED",
          message: `Too many failed attempts. Account locked for ${LOCKOUT_HOURS} hour${LOCKOUT_HOURS === 1 ? "" : "s"}.`,
          lockedUntil,
          minutesRemaining: LOCKOUT_HOURS * 60,
        });
      }

      const attemptsLeft = MAX_ATTEMPTS - newAttempts;
      return res.status(401).json({
        success: false,
        message: `Invalid email or password. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} remaining before lockout.`,
        attemptsLeft,
      });
    }

    // ============ SUCCESS — reset lockout ============
    const accessToken = signAccessToken({
      id: staff.id,
      schoolId: staff.schoolId,
      type: "STAFF",
    });
    const refreshToken = signRefreshToken(staff.id);
    const refreshTokenHash = await hashToken(refreshToken);

    await prisma.staff.update({
      where: { id: staff.id },
      data: {
        lastLogin: new Date(),
        refreshTokenHash,
        refreshTokenExpires: getRefreshExpiryDate(),
        // Reset lockout counters on successful login
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    await logAudit(req, {
      action: "LOGIN_SUCCESS",
      entity: "Session",
      targetName: staff.fullName,
      actor: staff,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token: accessToken,
        refreshToken,
        mustChangePassword: staff.mustChangePassword,
        staff: {
          id: staff.id,
          title: staff.title,
          firstName: staff.firstName,
          lastName: staff.lastName,
          fullName: staff.fullName,
          email: staff.email,
          phone: staff.phone,
          role: {
            id: staff.role.id,
            name: staff.role.name,
            permissions: staff.role.permissions,
          },
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
        title: true,
        firstName: true,
        lastName: true,
        fullName: true,
        email: true,
        phone: true,
        role: {
          select: { id: true, name: true, permissions: true },
        },
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

    await logAudit(req, {
      action: "PASSWORD_CHANGED",
      entity: "Staff",
      entityId: req.staff.id,
      targetName: req.staff.fullName,
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
      // Personal — split name
      title,
      firstName,
      lastName,
      email,
      phone,
      password,
      // School
      schoolName,
      address,
      city,
      schoolPhone,
    } = req.body;

    if (
      !firstName ||
      !lastName ||
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
        message:
          "firstName, lastName, email, phone, password, schoolName, address, city and schoolPhone are required",
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

    const fullName = buildFullName(title, firstName, lastName);
    const passwordHash = await bcrypt.hash(password, 12);
    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create school
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

      // 2. Create the 6 default roles for this school
      const roleMap = await createDefaultRolesForSchool(tx, school.id);

      // 3. Create the admin, linked to the School Admin role
      const admin = await tx.staff.create({
        data: {
          schoolId: school.id,
          roleId: roleMap["School Admin"],
          title: title?.trim() || null,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          fullName,
          email,
          phone,
          passwordHash,
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
        title: true,
        firstName: true,
        lastName: true,
        fullName: true,
        email: true,
        phone: true,
        role: {
          select: { id: true, name: true, permissions: true },
        },
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
            subscriptionStatus: true,
            trialEndsAt: true,
            subscriptionEndsAt: true,
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

    //  Normalize the student code: handle smart hyphens, spaces, and casing
    const normalizedCode = String(studentCode)
      .toUpperCase()
      .replace(/[\u2010-\u2015]/g, "-")
      .replace(/\s+/g, "")
      .replace(/[^\w\-]/g, "")
      .trim();

    console.log("  PARENT LOGIN ATTEMPT:", {
      raw: JSON.stringify(studentCode),
      rawCodes: Array.from(String(studentCode)).map((c) => c.charCodeAt(0)),
      normalized: normalizedCode,
      dob: dateOfBirth,
    });

    const student = await prisma.student.findFirst({
      where: { studentCode: normalizedCode },
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

// ==================== REFRESH ACCESS TOKEN ====================
// POST /api/auth/refresh
// Body: { refreshToken }
const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res
        .status(400)
        .json({ success: false, message: "Refresh token required" });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
        code: "REFRESH_EXPIRED",
      });
    }

    const staff = await prisma.staff.findUnique({
      where: { id: decoded.id },
    });

    if (!staff || !staff.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account not found or deactivated",
        code: "REFRESH_EXPIRED",
      });
    }

    // Verify the stored hash matches the provided refresh token
    if (!staff.refreshTokenHash || !staff.refreshTokenExpires) {
      return res.status(401).json({
        success: false,
        message: "No active session",
        code: "REFRESH_EXPIRED",
      });
    }

    if (staff.refreshTokenExpires < new Date()) {
      return res.status(401).json({
        success: false,
        message: "Session expired, please log in again",
        code: "REFRESH_EXPIRED",
      });
    }

    const matches = await compareToken(refreshToken, staff.refreshTokenHash);
    if (!matches) {
      return res.status(401).json({
        success: false,
        message: "Session is no longer valid",
        code: "REFRESH_EXPIRED",
      });
    }

    // Rotate: issue new access + new refresh, store new hash
    const newAccessToken = signAccessToken({
      id: staff.id,
      schoolId: staff.schoolId,
      type: "STAFF",
    });
    const newRefreshToken = signRefreshToken(staff.id);
    const newHash = await hashToken(newRefreshToken);

    await prisma.staff.update({
      where: { id: staff.id },
      data: {
        refreshTokenHash: newHash,
        refreshTokenExpires: getRefreshExpiryDate(),
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        token: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (err) {
    console.error("Refresh token error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to refresh session" });
  }
};

//  STAFF LOGOUT

const staffLogout = async (req, res) => {
  try {
    if (req.staff?.id) {
      await prisma.staff.update({
        where: { id: req.staff.id },
        data: {
          refreshTokenHash: null,
          refreshTokenExpires: null,
        },
      });
      await logAudit(req, {
        action: "LOGOUT",
        entity: "Session",
        targetName: req.staff.fullName,
      });
    }
    return res.status(200).json({ success: true, message: "Logged out" });
  } catch (err) {
    console.error("Logout error:", err);
    // Even on error, tell the client it's logged out — they should clear storage anyway
    return res.status(200).json({ success: true, message: "Logged out" });
  }
};

// ==================== FORGOT PASSWORD ====================
// POST /api/auth/forgot-password
// Body: { email }
// Always returns success to prevent email enumeration.
const forgotPassword = async (req, res) => {
  const GENERIC_MESSAGE =
    "If an account exists with that email, you'll receive a password reset link shortly.";

  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const staff = await prisma.staff.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // Silent success — don't reveal whether the account exists
    if (!staff || !staff.isActive) {
      return res.status(200).json({ success: true, message: GENERIC_MESSAGE });
    }

    // Generate token (raw, not hashed — expires in 30 min and single-use)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await prisma.staff.update({
      where: { id: staff.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: expiresAt,
      },
    });

    // Send email — log if it fails, but don't reveal to the caller
    const sendResult = await sendPasswordResetEmail({
      to: staff.email,
      name: staff.fullName,
      resetToken,
      expiresInMinutes: 30,
    });

    if (sendResult?.success === false) {
      console.error("Password reset email failed for", staff.email, sendResult);
    }

    await logAudit(req, {
      action: "PASSWORD_RESET_REQUESTED",
      entity: "Staff",
      entityId: staff.id,
      targetName: staff.fullName,
      actor: staff,
    });

    return res.status(200).json({ success: true, message: GENERIC_MESSAGE });
  } catch (err) {
    console.error("Forgot password error:", err);
    // Still return the generic message to avoid leaks
    return res.status(200).json({ success: true, message: GENERIC_MESSAGE });
  }
};

// ==================== VALIDATE RESET TOKEN ====================
// GET /api/auth/reset-password/:token
// Used by the frontend to decide if the token is still valid before
// rendering the "set new password" form.
const validateResetToken = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res
        .status(400)
        .json({ success: false, message: "Token is required" });
    }

    const staff = await prisma.staff.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() },
        isActive: true,
      },
      select: { id: true, email: true, fullName: true },
    });

    if (!staff) {
      return res.status(400).json({
        success: false,
        message: "This reset link is invalid or has expired.",
        code: "INVALID_RESET_TOKEN",
      });
    }

    return res.status(200).json({
      success: true,
      data: { email: staff.email, fullName: staff.fullName },
    });
  } catch (err) {
    console.error("Validate reset token error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to validate token" });
  }
};

// POST /api/auth/reset-password
// Body: { token, newPassword }
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Token and new password are required",
      });
    }

    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.valid) {
      return res.status(400).json({
        success: false,
        message: "Password does not meet policy",
        errors: pwCheck.errors,
      });
    }

    const staff = await prisma.staff.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() },
        isActive: true,
      },
    });

    if (!staff) {
      return res.status(400).json({
        success: false,
        message: "This reset link is invalid or has expired.",
        code: "INVALID_RESET_TOKEN",
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.staff.update({
      where: { id: staff.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
        // Invalidate all sessions — user must log in fresh with the new password
        refreshTokenHash: null,
        refreshTokenExpires: null,
      },
    });

    await logAudit(req, {
      action: "PASSWORD_RESET_COMPLETED",
      entity: "Staff",
      entityId: staff.id,
      targetName: staff.fullName,
      actor: staff,
    });

    return res.status(200).json({
      success: true,
      message: "Password updated. You can now log in with your new password.",
    });
  } catch (err) {
    console.error("Reset password error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to reset password" });
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
  refreshAccessToken,
  staffLogout,
  forgotPassword,
  validateResetToken,
  resetPassword,
  parentLoginWithStudentId,
  requestOTP,
  verifyOTP,
};
