const express = require("express");
const router = express.Router();
const { verifyStaff } = require("../middleware/auth");
const { isBursar } = require("../middleware/role");
const smsController = require("../controllers/sms.controller");

// Health check
router.get("/test", (req, res) => {
  res.json({ success: true, message: "SMS routes working" });
});

// Bulk SMS — admin or bursar only
router.post("/bulk", verifyStaff, isBursar, smsController.sendBulkSMS);

// SMS logs (audit trail)
router.get("/logs", verifyStaff, smsController.getSmsLogs);

module.exports = router;
