// backend/src/routes/audit.routes.js
const express = require("express");
const router = express.Router();
const { verifyStaff } = require("../middleware/auth");
const { requirePermission } = require("../middleware/role");
const auditController = require("../controllers/audit.controller");

router.use(verifyStaff);

// Read-only audit trail
router.get("/", requirePermission("audit", "read"), auditController.listLogs);
router.get(
  "/meta",
  requirePermission("audit", "read"),
  auditController.getMeta,
);
router.get(
  "/export",
  requirePermission("audit", "read"),
  auditController.exportCsv,
);
// Grouped view (one row per user)
router.get(
  "/grouped",
  requirePermission("audit", "read"),
  auditController.getGroupedByUser,
);

// User timeline (all actions for one user)
router.get(
  "/user/:staffId",
  requirePermission("audit", "read"),
  auditController.getUserTimeline,
);

router.get("/:id", requirePermission("audit", "read"), auditController.getLog);

module.exports = router;
