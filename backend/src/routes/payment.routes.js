const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const {
  recordCashPayment,
  submitPayment,
  verifyPayment,
  rejectPayment,
  getPayments,
  getPendingPayments,
  getMyChildPayments,
  getPaymentSummary,
} = require("../controllers/payment.controller");

const { verifyStaff, verifyParent } = require("../middleware/auth");
const { requirePermission } = require("../middleware/role");

// Multer — memory storage so we can upload to Cloudinary
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

// ==================== STAFF ROUTES ====================

// Dashboard summary — powers the Dashboard page (revenue stats, debtor counts, etc.)
router.get(
  "/summary",
  verifyStaff,
  requirePermission("dashboard", "read"),
  getPaymentSummary,
);

// List pending payments — viewing payments
router.get(
  "/pending",
  verifyStaff,
  requirePermission("payments", "read"),
  getPendingPayments,
);

// List all payments
router.get(
  "/",
  verifyStaff,
  requirePermission("payments", "read"),
  getPayments,
);

// Record a cash payment
router.post(
  "/cash",
  verifyStaff,
  requirePermission("payments", "write"),
  recordCashPayment,
);

// Verify a pending payment
router.patch(
  "/:id/verify",
  verifyStaff,
  requirePermission("payments", "verify"),
  verifyPayment,
);

// Reject a pending payment
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
