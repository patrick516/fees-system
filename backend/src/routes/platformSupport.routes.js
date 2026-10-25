const express = require("express");
const router = express.Router();
const controller = require("../controllers/support.controller");
const { verifyPlatformAdmin } = require("../middleware/platformAuth");

router.use(verifyPlatformAdmin);

router.get("/unread-count", controller.getPlatformUnreadCount);
router.get("/", controller.listPlatformTickets);
router.get("/:id", controller.getPlatformTicket);
router.post("/:id/reply", controller.replyAsPlatform);
router.post("/:id/close", controller.closeAsPlatform);

module.exports = router;
