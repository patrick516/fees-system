const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  verifyStaff,
  verifyParent,
  verifyStaffOrParent,
} = require("../middleware/auth");
const { requirePermission } = require("../middleware/role");
const examController = require("../controllers/exam.controller");

const upload = multer({ storage: multer.memoryStorage() });

// ==================== EXAM PERIODS ====================
router.get(
  "/periods",
  verifyStaff,
  requirePermission("results", "read"),
  examController.listExamPeriods,
);
router.post(
  "/periods",
  verifyStaff,
  requirePermission("results", "write"),
  examController.createExamPeriod,
);
router.put(
  "/periods/:id/activate",
  verifyStaff,
  requirePermission("results", "write"),
  examController.toggleExamPeriodActive,
);

// ==================== SUBJECTS ====================
router.get(
  "/subjects",
  verifyStaff,
  requirePermission("results", "read"),
  examController.getSubjects,
);
router.post(
  "/subjects",
  verifyStaff,
  requirePermission("results", "write"),
  examController.createSubject,
);

// ==================== GRADE BOUNDARIES ====================
router.get(
  "/grade-boundaries",
  verifyStaff,
  requirePermission("results", "read"),
  examController.getGradeBoundaries,
);
router.put(
  "/grade-boundaries",
  verifyStaff,
  requirePermission("results", "write"),
  examController.setGradeBoundaries,
);

// ==================== CLASS GRADING SYSTEM ====================
router.put(
  "/classes/:classId/grading-system",
  verifyStaff,
  requirePermission("results", "write"),
  examController.updateClassGradingSystem,
);

// ==================== UPLOAD ====================
router.post(
  "/results/upload",
  verifyStaff,
  requirePermission("results", "write"),
  upload.single("file"),
  examController.uploadResults,
);

// ==================== PENDING NAME MATCHES ====================
router.get(
  "/pending-rows",
  verifyStaff,
  requirePermission("results", "read"),
  examController.getPendingRows,
);
router.post(
  "/pending-rows/:id/resolve",
  verifyStaff,
  requirePermission("results", "write"),
  examController.resolvePendingRow,
);
router.delete(
  "/pending-rows/:id",
  verifyStaff,
  requirePermission("results", "write"),
  examController.discardPendingRow,
);

// ==================== ADMIN CLASS VIEW ====================
router.get(
  "/class-results",
  verifyStaff,
  requirePermission("results", "read"),
  examController.getClassResults,
);

// ==================== PARENT VIEW ====================
router.get(
  "/student-results/:studentId",
  verifyParent,
  examController.getStudentResults,
);

router.get(
  "/active-period",
  verifyStaffOrParent,
  examController.getActivePeriod,
);

module.exports = router;
