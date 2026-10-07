const express = require("express");
const router = express.Router();
const { verifyStaff } = require("../middleware/auth");
const { requirePermission } = require("../middleware/role");
const smsController = require("../controllers/sms.controller");

router.get("/test", (req, res) => {
  res.json({ success: true, message: "Notification routes working" });
});

router.post(
  "/bulk",
  verifyStaff,
  requirePermission("sms", "write"),
  smsController.sendBulkSMS,
);
// Any authenticated staff can view the log (read-only).
router.get("/logs", verifyStaff, smsController.getSmsLogs);

module.exports = router;
