const express = require("express");
const router = express.Router();
const {
  addStudent,
  getStudents,
  getStudent,
  updateStudent,
  searchStudents,
  getStudentByCode,
} = require("../controllers/student.controller");

const { verifyStaff, verifyParent } = require("../middleware/auth");
const { isBursar } = require("../middleware/role");

// Public - for parent login page to confirm student exists
router.get("/by-code/:code", getStudentByCode);

// Staff only routes
router.get("/search", verifyStaff, isBursar, searchStudents);
router.get("/", verifyStaff, isBursar, getStudents);
router.get("/:id", verifyStaff, isBursar, getStudent);
router.post("/", verifyStaff, isBursar, addStudent);
router.put("/:id", verifyStaff, isBursar, updateStudent);

module.exports = router;
