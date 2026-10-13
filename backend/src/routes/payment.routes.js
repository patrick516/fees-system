const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const malipoController = require("../controllers/malipo.controller");
const {
  recordCashPayment,
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

//  MALIPO ONLINE PAYMENTS
// Parent initiates a mobile money payment
router.post("/malipo/initiate", verifyParent, malipoController.initiatePayment);

// Public — Malipo calls this to confirm
router.post("/malipo/webhook", malipoController.webhook);

// Parent or staff polls for status
router.get(
  "/malipo/:id/status",
  verifyStaffOrParent,
  malipoController.getStatus,
);

//  STAFF ROUTES

// Payment channel insights — for the admin dashboard
router.get(
  "/insights",
  verifyStaff,
  requirePermission("payments", "read"),
  getPaymentInsights,
);

// Dashboard summary — powers the Dashboard page (revenue stats, debtor counts)
router.get(
  "/summary",
  verifyStaff,
  requirePermission("dashboard", "read"),
  getPaymentSummary,
);

// List pending payments
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

//  PARENT ROUTES
router.get("/my-child", verifyParent, getMyChildPayments);
router.post("/submit", verifyParent, upload.single("receipt"), submitPayment);

module.exports = router;
