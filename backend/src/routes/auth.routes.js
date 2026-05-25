const express = require("express");
const router = express.Router();

const {
  staffLogin,
  getStaffProfile,
  changePassword,
  parentLoginWithStudentId,
  requestOTP,
  verifyOTP,
} = require("../controllers/auth.controller");

const { verifyStaff } = require("../middleware/auth");

// Staff routes
router.post("/staff/login", staffLogin);
router.get("/staff/me", verifyStaff, getStaffProfile);
router.post("/staff/change-password", verifyStaff, changePassword);

// Parent routes
router.post("/parent/login-student-id", parentLoginWithStudentId);
router.post("/parent/request-otp", requestOTP);
router.post("/parent/verify-otp", verifyOTP);

module.exports = router;
