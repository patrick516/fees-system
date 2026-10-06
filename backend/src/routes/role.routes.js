const express = require("express");
const router = express.Router();
const {
  listRoles,
  createRole,
  updateRole,
  deleteRole,
} = require("../controllers/role.controller");
const { verifyStaff } = require("../middleware/auth");
const { requirePermission } = require("../middleware/role");

router.use(verifyStaff);
router.get("/", listRoles);
router.post("/", requirePermission("settings", "write"), createRole);
router.put("/:id", requirePermission("settings", "write"), updateRole);
router.delete("/:id", requirePermission("settings", "write"), deleteRole);

module.exports = router;
