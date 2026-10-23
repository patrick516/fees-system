const express = require("express");
const router = express.Router();
const {
  getFeesReport,
  getDebtorAgeingReport,
  getDailyCollectionReport,
  getFinancialStatement,
} = require("../controllers/report.controller");
const { verifyStaff } = require("../middleware/auth");
const { requirePermission } = require("../middleware/role");

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
