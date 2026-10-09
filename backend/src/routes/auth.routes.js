const express = require("express");
const router = express.Router();

const {
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
  parentLoginWithStudentId,
  requestOTP,
  verifyOTP,
} = require("../controllers/auth.controller");

const { verifyStaff } = require("../middleware/auth");

router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Auth routes are working",
  });
});

// Frontend signup page uses this to know if setup is already done
router.get("/setup-status", getSetupStatus);

// Public — no auth needed
router.post("/register", registerAdmin);
router.post("/verify-email", verifyEmail);
router.post("/resend-otp", resendOtp);
router.post("/refresh", refreshAccessToken);

router.post("/staff/logout", verifyStaff, staffLogout);

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
router.post("/accept-invitation", acceptInvitation);
router.get("/me", verifyStaff, getMe);

router.post("/parent/login-student-id", parentLoginWithStudentId);

router.post("/parent/request-otp", requestOTP);

router.post("/parent/verify-otp", verifyOTP);

module.exports = router;
