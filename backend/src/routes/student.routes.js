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
const {
  previewPromotion,
  promoteStudents,
} = require("../controllers/promotion.controller");

const { verifyStaff, verifyParent } = require("../middleware/auth");
const { isBursar, isAdmin } = require("../middleware/role");

// Public — parent login page
router.get("/by-code/:code", getStudentByCode);

// Promotion (register BEFORE /:id so it doesn't get captured)
router.get("/promote/preview", verifyStaff, isAdmin, previewPromotion);
router.post("/promote", verifyStaff, isAdmin, promoteStudents);

// Staff only
router.get("/search", verifyStaff, isBursar, searchStudents);
router.get("/", verifyStaff, isBursar, getStudents);
router.get("/:id", verifyStaff, isBursar, getStudent);
router.post("/", verifyStaff, isBursar, addStudent);
router.put("/:id", verifyStaff, isBursar, updateStudent);

module.exports = router;
