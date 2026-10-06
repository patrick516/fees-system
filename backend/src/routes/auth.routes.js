const express = require("express");
const router = express.Router();

const {
  // Staff (existing)
  staffLogin,
  getStaffProfile,
  changePassword,
  // Admin registration + verification (NEW)
  registerAdmin,
  verifyEmail,
  resendOtp,
  // Invitation (NEW)
  acceptInvitation,
  // Rich profile (NEW)
  getMe,
  // Parent (existing)
  parentLoginWithStudentId,
  requestOTP,
  verifyOTP,
} = require("../controllers/auth.controller");

const { verifyStaff } = require("../middleware/auth");

// ================= DEBUG =================
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Auth routes are working",
  });
});

// ================= ADMIN REGISTRATION (NEW) =================
// Public — no auth needed
router.post("/register", registerAdmin);
router.post("/verify-email", verifyEmail);
router.post("/resend-otp", resendOtp);

// ================= STAFF ROUTES =================

router.post(
  "/staff/login",
  (req, res, next) => {
    console.log("STAFF LOGIN ROUTE HIT");
    next();
  },
  staffLogin,
);

router.get("/staff/me", verifyStaff, getStaffProfile);

router.post("/staff/change-password", verifyStaff, changePassword);

// Public — the token in the body authenticates the request
router.post("/accept-invitation", acceptInvitation);

// Alternative endpoint for the new frontend that needs department info
router.get("/me", verifyStaff, getMe);

router.post("/parent/login-student-id", parentLoginWithStudentId);

router.post("/parent/request-otp", requestOTP);

router.post("/parent/verify-otp", verifyOTP);

module.exports = router;
