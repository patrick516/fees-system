// backend/src/routes/platformSubscription.routes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/platformSubscription.controller");
const {
  verifyPlatformAdmin,
  requireOwner,
} = require("../middleware/platformAuth");

router.use(verifyPlatformAdmin);

// List — any platform admin
router.get("/", controller.listSubscriptions);

// History — any platform admin
router.get("/:schoolId/history", controller.getPaymentHistory);
router.get("/analytics", controller.getAnalytics);
// Mutations — OWNER only
router.post("/:schoolId/mark-paid", requireOwner, controller.markPaid);
router.post("/:schoolId/extend-trial", requireOwner, controller.extendTrial);

module.exports = router;
