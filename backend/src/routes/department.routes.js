const express = require("express");
const router = express.Router();
const dept = require("../controllers/department.controller");
const { authenticate } = require("../middleware/auth");
const { requirePermission } = require("../middleware/role");

router.use(authenticate);

router.get("/", dept.listDepartments);
router.post("/", requirePermission("settings", "write"), dept.createDepartment);
router.put(
  "/:id",
  requirePermission("settings", "write"),
  dept.updateDepartment,
);
router.delete(
  "/:id",
  requirePermission("settings", "write"),
  dept.deleteDepartment,
);

module.exports = router;
