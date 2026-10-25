const express = require("express");
const router = express.Router();
const controller = require("../controllers/support.controller");
const { verifyParent } = require("../middleware/auth");

router.use(verifyParent);

router.get("/unread-count", controller.getParentUnreadCount);
router.get("/", controller.listParentTickets);
router.post("/", controller.createParentTicket);
router.get("/:id", controller.getParentTicket);
router.post("/:id/reply", controller.replyAsParent);

module.exports = router;
