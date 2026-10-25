const express = require("express");
const router = express.Router();
const controller = require("../controllers/support.controller");
const { verifyStaff } = require("../middleware/auth");
const { requirePermission } = require("../middleware/role");

router.use(verifyStaff);

// Specific routes FIRST to avoid /:id swallowing them
router.get("/unread-count", controller.getSchoolUnreadCount);

router.post(
  "/platform",
  requirePermission("support", "write"),
  controller.createPlatformTicket,
);
router.get(
  "/platform",
  requirePermission("support", "read"),
  controller.listMyPlatformTickets,
);
router.get(
  "/platform/:id",
  requirePermission("support", "read"),
  controller.getMyPlatformTicket,
);
router.post(
  "/platform/:id/reply",
  requirePermission("support", "write"),
  controller.replyToPlatform,
);

// School support tickets (parent → admin)
router.get(
  "/",
  requirePermission("support", "read"),
  controller.listSchoolTickets,
);
router.get(
  "/:id",
  requirePermission("support", "read"),
  controller.getSchoolTicket,
);
router.post(
  "/:id/reply",
  requirePermission("support", "write"),
  controller.replyAsAdmin,
);
router.post(
  "/:id/close",
  requirePermission("support", "write"),
  controller.closeAsAdmin,
);

module.exports = router;
