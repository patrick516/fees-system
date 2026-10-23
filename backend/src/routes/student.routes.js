const express = require("express");
const router = express.Router();
const multer = require("multer");

// ==================== IMPORTS (all at the top) ====================
const {
  addStudent,
  getStudents,
  getStudent,
  updateStudent,
  searchStudents,
  getStudentByCode,
  bulkImportPreview,
  bulkImport,
  applyDiscount, // 🎯 Added
  removeDiscount, // 🎯 Added
} = require("../controllers/student.controller");

const {
  previewPromotion,
  promoteStudents,
} = require("../controllers/promotion.controller");

const { verifyStaff } = require("../middleware/auth");
const { requirePermission } = require("../middleware/role");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ==================== PUBLIC ====================
// Parent login page — no auth
router.get("/by-code/:code", getStudentByCode);

// ==================== DISCOUNTS ====================
// 🎯 Moved below imports, using the direct function names
router.post(
  "/:id/discounts",
  verifyStaff,
  requirePermission("payments", "write"),
  applyDiscount,
);
router.delete(
  "/:id/discounts/:discountId",
  verifyStaff,
  requirePermission("payments", "write"),
  removeDiscount,
);

// ==================== BULK IMPORT ====================
// Must come before /:id — otherwise "bulk" is treated as an ID
router.post(
  "/bulk/preview",
  verifyStaff,
  requirePermission("students", "write"),
  upload.single("file"),
  bulkImportPreview,
);
router.post(
  "/bulk/import",
  verifyStaff,
  requirePermission("students", "write"),
  upload.single("file"),
  bulkImport,
);

// ==================== PROMOTION ====================
// Must come before /:id too
router.get(
  "/promote/preview",
  verifyStaff,
  requirePermission("students", "write"),
  previewPromotion,
);
router.post(
  "/promote",
  verifyStaff,
  requirePermission("students", "write"),
  promoteStudents,
);

// ==================== SEARCH ====================
router.get(
  "/search",
  verifyStaff,
  requirePermission("students", "read"),
  searchStudents,
);

// ==================== CRUD ====================
router.get(
  "/",
  verifyStaff,
  requirePermission("students", "read"),
  getStudents,
);
router.get(
  "/:id",
  verifyStaff,
  requirePermission("students", "read"),
  getStudent,
);
router.post(
  "/",
  verifyStaff,
  requirePermission("students", "write"),
  addStudent,
);
router.put(
  "/:id",
  verifyStaff,
  requirePermission("students", "write"),
  updateStudent,
);

module.exports = router;
