const express = require("express");
const router = express.Router();
const { getFeesReport } = require("../controllers/report.controller");
const { verifyStaff } = require("../middleware/auth");
const { isBursar } = require("../middleware/role");

router.get("/fees", verifyStaff, isBursar, getFeesReport);

module.exports = router;
