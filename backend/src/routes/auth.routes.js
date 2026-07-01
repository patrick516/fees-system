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

// ================= DEBUG =================
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Auth routes are working",
  });
});

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

// ================= PARENT ROUTES =================

router.post("/parent/login-student-id", parentLoginWithStudentId);

router.post("/parent/request-otp", requestOTP);

router.post("/parent/verify-otp", verifyOTP);

module.exports = router;
