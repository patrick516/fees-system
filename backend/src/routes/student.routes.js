const express = require("express");
const router = express.Router();
const multer = require("multer");

//  IMPORTS (all at the top)
const {
  addStudent,
  getStudents,
  getStudent,
  updateStudent,
  searchStudents,
  bulkImportPreview,
  bulkImport,
  applyDiscount,
  removeDiscount,
  updateStudentType,
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

//  DISCOUNTS
//  Moved below imports, using the direct function names
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

//  BULK IMPORT
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

//  PROMOTION
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

//  SEARCH
router.get(
  "/search",
  verifyStaff,
  requirePermission("students", "read"),
  searchStudents,
);

//  CRUD
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
router.put(
  "/:id/type",
  verifyStaff,
  requirePermission("students", "write"),
  updateStudentType,
);

//  GET /api/students/:id/subjects
// Returns only the subjects this student has dropped (isTaking: false)
router.get("/:id/subjects", verifyStaff, async (req, res) => {
  try {
    const dropped = await prisma.studentSubject.findMany({
      where: {
        studentId: req.params.id,
        isTaking: false,
        student: { schoolId: req.schoolId },
      },
      select: { subjectId: true },
    });
    res.json({ success: true, data: dropped });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load" });
  }
});

//  PUT /api/students/:id/subjects/:subjectId
// Toggles whether a student is taking a subject
router.put(
  "/:id/subjects/:subjectId",
  verifyStaff,
  requirePermission("classes", "write"),
  async (req, res) => {
    try {
      const { id, subjectId } = req.params;
      const { isTaking } = req.body;

      // Verify student belongs to this school
      const student = await prisma.student.findFirst({
        where: { id, schoolId: req.schoolId },
      });
      if (!student)
        return res
          .status(404)
          .json({ success: false, message: "Student not found" });

      if (isTaking) {
        // If taking it again, delete the "dropped" record
        await prisma.studentSubject.deleteMany({
          where: { studentId: id, subjectId },
        });
      } else {
        // If dropping, create/update the record
        await prisma.studentSubject.upsert({
          where: {
            studentId_subjectId: { studentId: id, subjectId },
          },
          update: { isTaking: false },
          create: { studentId: id, subjectId, isTaking: false },
        });
      }

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to update" });
    }
  },
);

module.exports = router;
