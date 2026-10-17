const express = require("express");
const router = express.Router();
const controller = require("../controllers/platformOnekhusa.controller");
const { verifyPlatformAdmin } = require("../middleware/platformAuth");

router.use(verifyPlatformAdmin);

router.get("/merchants", controller.listOneKhusaMerchants);

module.exports = router;
