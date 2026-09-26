const prisma = require("../config/db");
const { regenerateStudentCode } = require("../lib/utils");

// GET /api/students/promote/preview
// Returns: promotion map + students grouped by class
const previewPromotion = async (req, res) => {
  try {
    const classes = await prisma.class.findMany({
      where: { schoolId: req.schoolId, isActive: true },
      orderBy: { level: "asc" },
    });

    const students = await prisma.student.findMany({
      where: { schoolId: req.schoolId, isActive: true },
      include: { class: true },
      orderBy: { fullName: "asc" },
    });

    // Class-to-class promotion map, sorted by level
    const sorted = [...classes].sort((a, b) => a.level - b.level);
    const promotionMap = sorted.map((cls, i) => {
      const next = sorted[i + 1] || null;
      return {
        fromClass: { id: cls.id, name: cls.name, level: cls.level },
        toClass: next
          ? { id: next.id, name: next.name, level: next.level }
          : null, // null means graduating
      };
    });

    // Students grouped by class
    const studentsByClass = sorted.map((cls) => ({
      class: { id: cls.id, name: cls.name, level: cls.level },
      students: students
        .filter((s) => s.classId === cls.id)
        .map((s) => ({
          id: s.id,
          fullName: s.fullName,
          studentCode: s.studentCode,
          gender: s.gender,
        })),
    }));

    res.json({
      success: true,
      data: { promotionMap, studentsByClass },
    });
  } catch (err) {
    console.error("Preview promotion error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load promotion preview",
    });
  }
};

// POST /api/students/promote
// Body: { promotions: [{ studentId, toClassId }], graduations: [studentId] }
const promoteStudents = async (req, res) => {
  try {
    const { promotions = [], graduations = [] } = req.body;

    if (promotions.length === 0 && graduations.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No students selected",
      });
    }

    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
    });

    if (!school) {
      return res
        .status(404)
        .json({ success: false, message: "School not found" });
    }

    const results = { promoted: [], graduated: [], errors: [] };

    // ==================== PROMOTE ====================
    for (const p of promotions) {
      try {
        const student = await prisma.student.findFirst({
          where: { id: p.studentId, schoolId: req.schoolId },
          include: { class: true },
        });

        if (!student) {
          results.errors.push(`${p.studentId}: not found`);
          continue;
        }

        const newClass = await prisma.class.findFirst({
          where: { id: p.toClassId, schoolId: req.schoolId },
        });

        if (!newClass) {
          results.errors.push(`${p.studentId}: target class not found`);
          continue;
        }

        const oldCode = student.studentCode;
        const newCode = regenerateStudentCode(
          school.name,
          newClass.name,
          newClass.level,
          oldCode,
        );

        await prisma.student.update({
          where: { id: student.id },
          data: {
            classId: newClass.id,
            studentCode: newCode,
            formerStudentCodes: { push: oldCode },
          },
        });

        results.promoted.push({
          studentId: student.id,
          fullName: student.fullName,
          fromClass: student.class.name,
          toClass: newClass.name,
          oldCode,
          newCode,
        });
      } catch (err) {
        results.errors.push(`${p.studentId}: ${err.message}`);
      }
    }

    // ==================== GRADUATE ====================
    for (const studentId of graduations) {
      try {
        const student = await prisma.student.findFirst({
          where: { id: studentId, schoolId: req.schoolId },
        });

        if (!student) {
          results.errors.push(`${studentId}: not found`);
          continue;
        }

        await prisma.student.update({
          where: { id: student.id },
          data: { isActive: false },
        });

        results.graduated.push({
          studentId: student.id,
          fullName: student.fullName,
        });
      } catch (err) {
        results.errors.push(`${studentId}: ${err.message}`);
      }
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        schoolId: req.schoolId,
        staffId: req.staff.id,
        action: "STUDENT_PROMOTION",
        entity: "Student",
        changes: {
          promotedCount: results.promoted.length,
          graduatedCount: results.graduated.length,
          errors: results.errors,
        },
      },
    });

    res.json({
      success: true,
      message: `Promoted ${results.promoted.length}, graduated ${results.graduated.length}`,
      data: results,
    });
  } catch (err) {
    console.error("Promote students error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to promote students" });
  }
};

module.exports = { previewPromotion, promoteStudents };
