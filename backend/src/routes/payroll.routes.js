const express = require("express");
const router = express.Router();
const controller = require("../controllers/payroll.controller");
const { verifyStaff } = require("../middleware/auth");
const { requirePermission } = require("../middleware/role");

router.use(verifyStaff);

router.post(
  "/generate",
  requirePermission("payroll", "write"),
  controller.generatePayroll,
);
router.get("/", requirePermission("payroll", "read"), controller.listPayroll);
router.get(
  "/summary",
  requirePermission("payroll", "read"),
  controller.getYearlySummary,
);
router.put(
  "/:id",
  requirePermission("payroll", "write"),
  controller.updatePayrollRecord,
);
router.delete(
  "/:id",
  requirePermission("payroll", "delete"),
  controller.deletePayrollRecord,
);

module.exports = router;
