const express = require("express");
const router = express.Router();
const multer = require("multer");
const { verifyStaff, verifyParent } = require("../middleware/auth");
const { isAdmin, isBursar } = require("../middleware/role");
const examController = require("../controllers/exam.controller");

const upload = multer({ storage: multer.memoryStorage() });

// ==================== EXAM PERIODS ====================
router.get("/periods", verifyStaff, examController.listExamPeriods);
router.post("/periods", verifyStaff, isAdmin, examController.createExamPeriod);
router.put(
  "/periods/:id/activate",
  verifyStaff,
  isAdmin,
  examController.toggleExamPeriodActive,
);

// ==================== SUBJECTS ====================
router.get("/subjects", verifyStaff, examController.getSubjects);
router.post("/subjects", verifyStaff, isAdmin, examController.createSubject);

// ==================== GRADE BOUNDARIES ====================
router.get("/grade-boundaries", verifyStaff, examController.getGradeBoundaries);
router.put(
  "/grade-boundaries",
  verifyStaff,
  isAdmin,
  examController.setGradeBoundaries,
);

// ==================== UPLOAD ====================
router.post(
  "/results/upload",
  verifyStaff,
  isBursar,
  upload.single("file"),
  examController.uploadResults,
);

// ==================== PARENT VIEW ====================
router.get(
  "/student-results/:studentId",
  verifyParent,
  examController.getStudentResults,
);
router.get("/active-period", verifyParent, examController.getActivePeriod);

module.exports = router;
