const express = require("express");
const router = express.Router();
const { getFeesReport } = require("../controllers/report.controller");
const { verifyStaff } = require("../middleware/auth");
const { requirePermission } = require("../middleware/role");

router.get(
  "/fees",
  verifyStaff,
  requirePermission("reports", "read"),
  getFeesReport,
);

module.exports = router;
