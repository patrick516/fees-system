// backend/src/routes/platformSettings.routes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/platformSettings.controller");
const {
  verifyPlatformAdmin,
  requireOwner,
} = require("../middleware/platformAuth");

router.use(verifyPlatformAdmin);

router.get("/", controller.getSettings);
router.put("/", requireOwner, controller.updateSettings);

module.exports = router;
