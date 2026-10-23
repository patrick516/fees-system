const express = require("express");
const router = express.Router();
const controller = require("../controllers/platformSchool.controller");
const requestController = require("../controllers/schoolRequest.controller");
const {
  verifyPlatformAdmin,
  requireOwner,
} = require("../middleware/platformAuth");

router.use(verifyPlatformAdmin);

// 🎯 SCHOOL REQUESTS (must be before /:id)
router.get("/requests", requireOwner, requestController.listRequests);
router.get("/requests/pending-count", requestController.getPendingCount);
router.post(
  "/requests/:id/approve",
  requireOwner,
  requestController.approveRequest,
);
router.post(
  "/requests/:id/reject",
  requireOwner,
  requestController.rejectRequest,
);

// Schools
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
