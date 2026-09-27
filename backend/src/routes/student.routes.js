const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  addStudent,
  getStudents,
  getStudent,
  updateStudent,
  searchStudents,
  getStudentByCode,
  bulkImportPreview,
  bulkImport,
} = require("../controllers/student.controller");
const {
  previewPromotion,
  promoteStudents,
} = require("../controllers/promotion.controller");

const { verifyStaff, verifyParent } = require("../middleware/auth");
const { isBursar, isAdmin } = require("../middleware/role");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Public — parent login page
router.get("/by-code/:code", getStudentByCode);

// Bulk import — must come before /:id
router.post(
  "/bulk/preview",
  verifyStaff,
  isBursar,
  upload.single("file"),
  bulkImportPreview,
);
router.post(
  "/bulk/import",
  verifyStaff,
  isBursar,
  upload.single("file"),
  bulkImport,
);

// Promotion — before /:id
router.get("/promote/preview", verifyStaff, isAdmin, previewPromotion);
router.post("/promote", verifyStaff, isAdmin, promoteStudents);

// Staff only
router.get("/search", verifyStaff, isBursar, searchStudents);
router.get("/", verifyStaff, isBursar, getStudents);
router.get("/:id", verifyStaff, isBursar, getStudent);
router.post("/", verifyStaff, isBursar, addStudent);
router.put("/:id", verifyStaff, isBursar, updateStudent);

module.exports = router;
