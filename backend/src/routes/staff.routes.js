const express = require("express");
const router = express.Router();
const staff = require("../controllers/staff.controller");
const { authenticate } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");

router.use(authenticate);
router.use(requireRole("SCHOOL_ADMIN"));

router.post("/invite", staff.inviteStaff);
router.get("/", staff.listStaff);
router.post("/:id/resend-invite", staff.resendInvite);
router.put("/:id", staff.updateStaff);
router.delete("/:id", staff.removeStaff);

module.exports = router;
