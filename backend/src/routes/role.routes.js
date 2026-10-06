const express = require("express");
const router = express.Router();
const { listRoles } = require("../controllers/role.controller");
const { verifyStaff } = require("../middleware/auth");

router.use(verifyStaff);

router.get("/", listRoles);

module.exports = router;
