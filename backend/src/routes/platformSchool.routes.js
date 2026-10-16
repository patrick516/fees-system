// backend/src/routes/platformSchool.routes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/platformSchool.controller");
const {
  verifyPlatformAdmin,
  requireOwner,
} = require("../middleware/platformAuth");

// Every route here requires a valid platform-admin token
router.use(verifyPlatformAdmin);

// List + view — any platform admin (OWNER or SUPPORT)
router.get("/", controller.listSchools);
router.get("/:id", controller.getSchool);

// Mutations — OWNER only
router.post("/invite", requireOwner, controller.inviteSchool);
router.put("/:id", requireOwner, controller.updateSchool);
router.patch("/:id/status", requireOwner, controller.updateSchoolStatus);
router.put("/:id/onekhusa", requireOwner, controller.updateOneKhusa);
router.post(
  "/:id/unlock-settlement",
  requireOwner,
  controller.unlockSettlement,
);

module.exports = router;
