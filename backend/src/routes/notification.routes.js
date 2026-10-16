// backend/src/routes/notification.routes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/notification.controller");
const {
  verifyPlatformAdmin,
  requireOwner,
} = require("../middleware/platformAuth");

router.use(verifyPlatformAdmin);

router.get("/", controller.listNotifications);
router.get("/unread-count", controller.getUnreadCount);
router.post("/mark-all-read", controller.markAllRead);
router.post("/:id/read", controller.markRead);
router.post("/:id/resolve", requireOwner, controller.resolveNotification);

module.exports = router;
