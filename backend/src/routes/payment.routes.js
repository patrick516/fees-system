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
const { isBursar } = require("../middleware/role");

// Multer — use memory storage so we can upload to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf/;
    const isValid = allowed.test(path.extname(file.originalname).toLowerCase());
    if (isValid) {
      cb(null, true);
    } else {
      cb(new Error("Only images (jpg, png) and PDF files are allowed"));
    }
  },
});

// Staff routes
router.get("/summary", verifyStaff, isBursar, getPaymentSummary);
router.get("/pending", verifyStaff, isBursar, getPendingPayments);
router.get("/", verifyStaff, isBursar, getPayments);
router.post("/cash", verifyStaff, isBursar, recordCashPayment);
router.patch("/:id/verify", verifyStaff, isBursar, verifyPayment);
router.patch("/:id/reject", verifyStaff, isBursar, rejectPayment);

// Parent routes
router.get("/my-child", verifyParent, getMyChildPayments);
router.post("/submit", verifyParent, upload.single("receipt"), submitPayment);

module.exports = router;
