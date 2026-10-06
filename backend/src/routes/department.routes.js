const express = require("express");
const router = express.Router();
const dept = require("../controllers/department.controller");
const { authenticate } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");

router.use(authenticate);

router.get("/", dept.listDepartments);
router.post("/", requireRole("SCHOOL_ADMIN"), dept.createDepartment);
router.put("/:id", requireRole("SCHOOL_ADMIN"), dept.updateDepartment);
router.delete("/:id", requireRole("SCHOOL_ADMIN"), dept.deleteDepartment);

module.exports = router;
