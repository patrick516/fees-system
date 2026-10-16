// backend/src/routes/platformAuth.routes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/platformAuth.controller");
const { verifyPlatformAdmin } = require("../middleware/platformAuth");

//  PUBLIC
router.get("/setup-status", controller.getSetupStatus);
router.post("/setup", controller.setupOwner);

//  LOGIN / REFRESH (public)
router.post("/auth/login", controller.login);
router.post("/auth/refresh", controller.refresh);

//  AUTHENTICATED
router.get("/auth/me", verifyPlatformAdmin, controller.getMe);
router.post("/auth/logout", verifyPlatformAdmin, controller.logout);

module.exports = router;
