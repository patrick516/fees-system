const express = require("express");
const router = express.Router();
const {
  getFeesReport,
  getDebtorAgeingReport,
  getDailyCollectionReport,
  getFinancialStatement,
} = require("../controllers/report.controller");
const { downloadReportCard } = require("../controllers/reportCard.controller");
const { verifyStaff, verifyStaffOrParent } = require("../middleware/auth");
const { requirePermission } = require("../middleware/role");

// 🎯 REPORT CARD: Accessible by BOTH Staff and Parents
// (The controller handles the security to ensure a parent can only download their own child's card)
router.get("/report-card", verifyStaffOrParent, downloadReportCard);

// ==================== STAFF ONLY REPORTS ====================

// Existing
router.get(
  "/fees",
  verifyStaff,
  requirePermission("reports", "read"),
  getFeesReport,
);

// New Reports
router.get(
  "/ageing",
  verifyStaff,
  requirePermission("reports", "read"),
  getDebtorAgeingReport,
);
router.get(
  "/daily",
  verifyStaff,
  requirePermission("reports", "read"),
  getDailyCollectionReport,
);
router.get(
  "/financial",
  verifyStaff,
  requirePermission("reports", "read"),
  getFinancialStatement,
);

module.exports = router;
