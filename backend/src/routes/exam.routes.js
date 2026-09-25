const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  verifyStaff,
  verifyParent,
  verifyStaffOrParent,
} = require("../middleware/auth");
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

// ==================== CLASS GRADING SYSTEM ====================
router.put(
  "/classes/:classId/grading-system",
  verifyStaff,
  isAdmin,
  examController.updateClassGradingSystem,
);

// ==================== UPLOAD ====================
router.post(
  "/results/upload",
  verifyStaff,
  isBursar,
  upload.single("file"),
  examController.uploadResults,
);

// ==================== PENDING NAME MATCHES ====================
router.get("/pending-rows", verifyStaff, examController.getPendingRows);
router.post(
  "/pending-rows/:id/resolve",
  verifyStaff,
  isAdmin,
  examController.resolvePendingRow,
);
router.delete(
  "/pending-rows/:id",
  verifyStaff,
  isAdmin,
  examController.discardPendingRow,
);

// ==================== ADMIN CLASS VIEW ====================
router.get("/class-results", verifyStaff, examController.getClassResults);

// ==================== PARENT VIEW ====================
router.get(
  "/student-results/:studentId",
  verifyParent,
  examController.getStudentResults,
);

// Active period — read-only status flag telling the parent portal whether to
// show the Results tab. Accepts both parent and staff tokens.
router.get(
  "/active-period",
  verifyStaffOrParent,
  examController.getActivePeriod,
);

module.exports = router;
