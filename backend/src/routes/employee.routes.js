const express = require("express");
const router = express.Router();
const controller = require("../controllers/employee.controller");
const { verifyStaff } = require("../middleware/auth");
const { requirePermission } = require("../middleware/role");

router.use(verifyStaff);

router.get(
  "/",
  requirePermission("employees", "read"),
  controller.listEmployees,
);
router.get(
  "/:id",
  requirePermission("employees", "read"),
  controller.getEmployee,
);
router.post(
  "/",
  requirePermission("employees", "write"),
  controller.createEmployee,
);
router.put(
  "/:id",
  requirePermission("employees", "write"),
  controller.updateEmployee,
);
router.delete(
  "/:id",
  requirePermission("employees", "delete"),
  controller.terminateEmployee,
);

module.exports = router;
