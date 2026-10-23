const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const onekhusaController = require("../controllers/onekhusa.controller");
const {
  recordManualPayment, // 🎯 Renamed (was recordCashPayment)
  submitPayment,
  verifyPayment,
  rejectPayment,
  getPayments,
  getPendingPayments,
  getMyChildPayments,
  getPaymentSummary,
  getPaymentInsights,
} = require("../controllers/payment.controller");

const {
  verifyStaff,
  verifyParent,
  verifyStaffOrParent,
} = require("../middleware/auth");
const { requirePermission } = require("../middleware/role");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf/;
    const isValid = allowed.test(path.extname(file.originalname).toLowerCase());
    if (isValid) cb(null, true);
    else cb(new Error("Only images (jpg, png) and PDF files are allowed"));
  },
});

// ==================== ONEKHUSA ONLINE PAYMENTS ====================
router.post(
  "/onekhusa/initiate",
  verifyParent,
  onekhusaController.initiatePayment,
);

// Public — OneKhusa calls this
router.post("/onekhusa/webhook", onekhusaController.webhook);

// Parent or staff polls for status
router.get(
  "/onekhusa/:id/status",
  verifyStaffOrParent,
  onekhusaController.getStatus,
);

// ==================== STAFF ROUTES ====================
router.get(
  "/insights",
  verifyStaff,
  requirePermission("payments", "read"),
  getPaymentInsights,
);

router.get(
  "/summary",
  verifyStaff,
  requirePermission("dashboard", "read"),
  getPaymentSummary,
);

router.get(
  "/pending",
  verifyStaff,
  requirePermission("payments", "read"),
  getPendingPayments,
);

router.get(
  "/",
  verifyStaff,
  requirePermission("payments", "read"),
  getPayments,
);

// 🎯 Fixed: uses the bare function name, not paymentController.xxx
router.post(
  "/manual",
  verifyStaff,
  requirePermission("payments", "write"),
  recordManualPayment,
);

router.patch(
  "/:id/verify",
  verifyStaff,
  requirePermission("payments", "verify"),
  verifyPayment,
);

router.patch(
  "/:id/reject",
  verifyStaff,
  requirePermission("payments", "verify"),
  rejectPayment,
);

// ==================== PARENT ROUTES ====================
router.get("/my-child", verifyParent, getMyChildPayments);
router.post("/submit", verifyParent, upload.single("receipt"), submitPayment);

module.exports = router;
