const prisma = require("../config/db");
const XLSX = require("xlsx");
const { uploadToCloudinary } = require("../lib/cloudinary");

// Look up the grade (point and/or label) for a given percentage mark
const resolveGrade = (mark, boundaries) => {
  const match = boundaries.find(
    (b) => mark >= b.minPercent && mark <= b.maxPercent,
  );
  return {
    gradePoint: match ? match.gradePoint : null,
    gradeLabel: match ? match.gradeLabel : null,
  };
};

// ==================== EXAM PERIODS ====================

// POST /api/exams/periods
const createExamPeriod = async (req, res) => {
  try {
    const { name, term, academicYear, examType } = req.body;
    if (!name || !term || !academicYear) {
      return res.status(400).json({
        success: false,
        message: "name, term and academicYear are required",
      });
    }

    const period = await prisma.examPeriod.create({
      data: {
        schoolId: req.schoolId,
        name,
        term,
        academicYear,
        examType: examType || "END_TERM",
      },
    });

    res.status(201).json({ success: true, data: period });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "This exam period already exists",
      });
    }
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to create exam period" });
  }
};

// GET /api/exams/periods
const listExamPeriods = async (req, res) => {
  try {
    const periods = await prisma.examPeriod.findMany({
      where: { schoolId: req.schoolId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: periods });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to get exam periods" });
  }
};

// PUT /api/exams/periods/:id/activate
// Toggles whether parents can view this period's results
const toggleExamPeriodActive = async (req, res) => {
  try {
    const { isActive } = req.body;
    const period = await prisma.examPeriod.findFirst({
      where: { id: req.params.id, schoolId: req.schoolId },
    });
    if (!period) {
      return res
        .status(404)
        .json({ success: false, message: "Exam period not found" });
    }

    const updated = await prisma.examPeriod.update({
      where: { id: period.id },
      data: { isActive: !!isActive },
    });

    res.json({
      success: true,
      message: isActive
        ? "Results are now visible to parents"
        : "Results hidden from parents",
      data: updated,
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to update exam period" });
  }
};

// ==================== SUBJECTS ====================

// GET /api/exams/subjects?classId=
const getSubjects = async (req, res) => {
  try {
    const { classId } = req.query;
    const where = { schoolId: req.schoolId, isActive: true };
    if (classId) where.classId = classId;

    const subjects = await prisma.subject.findMany({
      where,
      orderBy: { name: "asc" },
    });
    res.json({ success: true, data: subjects });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to get subjects" });
  }
};

// POST /api/exams/subjects
const createSubject = async (req, res) => {
  try {
    const { classId, name, code } = req.body;
    if (!classId || !name) {
      return res.status(400).json({
        success: false,
        message: "classId and name are required",
      });
    }

    const subject = await prisma.subject.create({
      data: { schoolId: req.schoolId, classId, name, code },
    });

    res.status(201).json({ success: true, data: subject });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Subject already exists for this class",
      });
    }
    res
      .status(500)
      .json({ success: false, message: "Failed to create subject" });
  }
};

// ==================== GRADE BOUNDARIES ====================
// GET /api/exams/grade-boundaries?system=POINTS|LETTER
const getGradeBoundaries = async (req, res) => {
  try {
    const system = req.query.system === "LETTER" ? "LETTER" : "POINTS";
    const boundaries = await prisma.gradeBoundary.findMany({
      where: { schoolId: req.schoolId, system },
      orderBy: { minPercent: "desc" },
    });
    res.json({ success: true, data: boundaries });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to get grade boundaries" });
  }
};

// PUT /api/exams/grade-boundaries
// Body: { system: "POINTS"|"LETTER", boundaries: [{ minPercent, maxPercent, gradePoint?, gradeLabel? }, ...] }
// Replaces the whole set for this school, for that system only
const setGradeBoundaries = async (req, res) => {
  try {
    const { boundaries, system } = req.body;
    const resolvedSystem = system === "LETTER" ? "LETTER" : "POINTS";

    if (!Array.isArray(boundaries) || boundaries.length === 0) {
      return res.status(400).json({
        success: false,
        message: "boundaries array is required",
      });
    }

    await prisma.gradeBoundary.deleteMany({
      where: { schoolId: req.schoolId, system: resolvedSystem },
    });

    const created = await prisma.gradeBoundary.createMany({
      data: boundaries.map((b) => ({
        schoolId: req.schoolId,
        system: resolvedSystem,
        minPercent: parseFloat(b.minPercent),
        maxPercent: parseFloat(b.maxPercent),
        gradePoint:
          resolvedSystem === "POINTS" && b.gradePoint !== undefined
            ? parseInt(b.gradePoint)
            : null,
        gradeLabel: b.gradeLabel || null,
      })),
    });

    res.json({
      success: true,
      message: "Grade boundaries updated",
      data: created,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to update grade boundaries" });
  }
};

// ==================== RESULTS UPLOAD ====================

// POST /api/exams/results/upload
// multipart/form-data: file, classId, examPeriodId
const uploadResults = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }
    const { classId, examPeriodId } = req.body;
    if (!classId || !examPeriodId) {
      return res.status(400).json({
        success: false,
        message: "classId and examPeriodId are required",
      });
    }

    const cls = await prisma.class.findFirst({
      where: { id: classId, schoolId: req.schoolId },
    });
    if (!cls) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });
    }

    const boundaries = await prisma.gradeBoundary.findMany({
      where: { schoolId: req.schoolId, system: cls.gradingSystem },
    });
    if (boundaries.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Please set ${cls.gradingSystem === "LETTER" ? "letter grade" : "point"} boundaries before uploading results for this class`,
      });
    }

    // Archive the original sheet in Cloudinary, same pattern as receipts/logos
    let sourceFileUrl = null;
    try {
      const uploadResult = await uploadToCloudinary(req.file.buffer, {
        folder: process.env.CLOUDINARY_RESULTS_FOLDER || "exam_results_sheets",
        resource_type: "auto",
      });
      sourceFileUrl = uploadResult.secure_url;
    } catch (uploadErr) {
      console.error("Cloudinary upload failed (non-blocking):", uploadErr);
    }

    // Parse the sheet: first column = Student ID, remaining columns = subject names
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

    if (rows.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Sheet is empty" });
    }

    const columns = Object.keys(rows[0]);
    const studentIdColumn = columns[0]; // eg "Student ID"
    const subjectColumns = columns.slice(1);

    // Ensure a Subject record exists for each column, for this class
    // Trim + case-insensitive match so re-uploads never create duplicate subjects
    const subjectMap = {};
    for (const rawSubjectName of subjectColumns) {
      const subjectName = String(rawSubjectName).trim();
      let subject = await prisma.subject.findFirst({
        where: {
          schoolId: req.schoolId,
          classId,
          name: { equals: subjectName, mode: "insensitive" },
        },
      });
      if (!subject) {
        subject = await prisma.subject.create({
          data: { schoolId: req.schoolId, classId, name: subjectName },
        });
      }
      subjectMap[rawSubjectName] = subject.id;
    }

    let processed = 0;
    const errors = [];

    for (const row of rows) {
      const studentCode = row[studentIdColumn];
      if (!studentCode) continue;

      const student = await prisma.student.findFirst({
        where: {
          schoolId: req.schoolId,
          studentCode: String(studentCode).trim(),
        },
      });

      if (!student) {
        errors.push(`Student ${studentCode} not found`);
        continue;
      }

      if (student.classId !== classId) {
        errors.push(
          `Student ${studentCode} (${student.fullName}) is not in the selected class — skipped`,
        );
        continue;
      }

      for (const subjectName of subjectColumns) {
        const rawMark = row[subjectName];
        if (rawMark === null || rawMark === undefined || rawMark === "")
          continue;

        const mark = parseFloat(rawMark);
        if (isNaN(mark)) continue;

        const { gradePoint, gradeLabel } = resolveGrade(mark, boundaries);

        await prisma.examResult.upsert({
          where: {
            studentId_subjectId_examPeriodId: {
              studentId: student.id,
              subjectId: subjectMap[subjectName],
              examPeriodId,
            },
          },
          update: { mark, gradePoint, gradeLabel },
          create: {
            schoolId: req.schoolId,
            studentId: student.id,
            subjectId: subjectMap[subjectName],
            examPeriodId,
            mark,
            gradePoint,
            gradeLabel,
          },
        });
      }
      processed++;
    }

    await prisma.auditLog.create({
      data: {
        schoolId: req.schoolId,
        staffId: req.staff.id,
        action: "EXAM_RESULTS_UPLOADED",
        entity: "ExamPeriod",
        entityId: examPeriodId,
        changes: {
          classId,
          studentsProcessed: processed,
          errors,
          sourceFileUrl,
        },
      },
    });

    res.json({
      success: true,
      message: `Processed ${processed} student(s)${errors.length ? `, ${errors.length} issue(s)` : ""}`,
      data: { processed, errors, sourceFileUrl },
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to upload results" });
  }
};

// ==================== PARENT VIEW ====================

const getStudentResults = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { examPeriodId } = req.query;

    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: req.student.schoolId },
      include: { class: true },
    });
    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    let period;
    if (examPeriodId) {
      period = await prisma.examPeriod.findFirst({
        where: {
          id: examPeriodId,
          schoolId: req.student.schoolId,
          isActive: true,
        },
      });
    } else {
      period = await prisma.examPeriod.findFirst({
        where: { schoolId: req.student.schoolId, isActive: true },
        orderBy: { createdAt: "desc" },
      });
    }

    if (!period) {
      return res.status(404).json({
        success: false,
        message: "Results are not available yet for this term",
      });
    }

    const results = await prisma.examResult.findMany({
      where: { studentId, examPeriodId: period.id },
      include: { subject: { select: { name: true } } },
      orderBy: { subject: { name: "asc" } },
    });

    const totalMarks = results.reduce((sum, r) => sum + r.mark, 0);
    const gradingSystem = student.class.gradingSystem;

    const baseData = {
      student: {
        fullName: student.fullName,
        studentCode: student.studentCode,
        className: student.class.name,
      },
      examPeriod: {
        name: period.name,
        term: period.term,
        academicYear: period.academicYear,
      },
      gradingSystem,
      totalMarks,
    };

    if (gradingSystem === "LETTER") {
      const average = results.length > 0 ? totalMarks / results.length : 0;
      const letterBoundaries = await prisma.gradeBoundary.findMany({
        where: { schoolId: req.student.schoolId, system: "LETTER" },
      });
      const { gradeLabel: overallGrade } = resolveGrade(
        average,
        letterBoundaries,
      );

      return res.json({
        success: true,
        data: {
          ...baseData,
          results: results.map((r) => ({
            subject: r.subject.name,
            mark: r.mark,
            gradeLabel: r.gradeLabel,
          })),
          averageMark: Math.round(average * 10) / 10,
          overallGrade,
        },
      });
    }

    // POINTS system — best 6 subjects, lower point = better
    const withPoints = results.filter(
      (r) => r.gradePoint !== null && r.gradePoint !== undefined,
    );
    const sortedByBest = [...withPoints].sort(
      (a, b) => a.gradePoint - b.gradePoint,
    );
    const bestSix = sortedByBest.slice(0, 6);
    const bestSixIds = new Set(bestSix.map((r) => r.id));
    const totalPoints = bestSix.reduce((sum, r) => sum + r.gradePoint, 0);

    res.json({
      success: true,
      data: {
        ...baseData,
        results: results.map((r) => ({
          subject: r.subject.name,
          mark: r.mark,
          gradePoint: r.gradePoint,
          countedInTotal: bestSixIds.has(r.id),
        })),
        totalPoints,
        subjectsCounted: bestSix.length,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to get results" });
  }
};
const getClassResults = async (req, res) => {
  try {
    const { classId, examPeriodId } = req.query;
    if (!classId || !examPeriodId) {
      return res.status(400).json({
        success: false,
        message: "classId and examPeriodId are required",
      });
    }

    const cls = await prisma.class.findFirst({
      where: { id: classId, schoolId: req.schoolId },
    });
    if (!cls) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });
    }

    const students = await prisma.student.findMany({
      where: { schoolId: req.schoolId, classId, isActive: true },
      orderBy: { fullName: "asc" },
    });

    let letterBoundaries = [];
    if (cls.gradingSystem === "LETTER") {
      letterBoundaries = await prisma.gradeBoundary.findMany({
        where: { schoolId: req.schoolId, system: "LETTER" },
      });
    }

    const rows = [];

    for (const student of students) {
      const results = await prisma.examResult.findMany({
        where: { studentId: student.id, examPeriodId },
        include: { subject: { select: { name: true } } },
        orderBy: { subject: { name: "asc" } },
      });

      if (results.length === 0) continue; // skip students with no results uploaded yet

      const totalMarks = results.reduce((sum, r) => sum + r.mark, 0);

      if (cls.gradingSystem === "LETTER") {
        const average = totalMarks / results.length;
        const { gradeLabel: overallGrade } = resolveGrade(
          average,
          letterBoundaries,
        );
        rows.push({
          studentId: student.id,
          studentCode: student.studentCode,
          fullName: student.fullName,
          subjectsSat: results.length,
          totalMarks,
          averageMark: Math.round(average * 10) / 10,
          overallGrade,
          subjects: results.map((r) => ({
            subject: r.subject.name,
            mark: r.mark,
            gradeLabel: r.gradeLabel,
          })),
        });
      } else {
        const withPoints = results.filter(
          (r) => r.gradePoint !== null && r.gradePoint !== undefined,
        );
        const sortedByBest = [...withPoints].sort(
          (a, b) => a.gradePoint - b.gradePoint,
        );
        const bestSix = sortedByBest.slice(0, 6);
        const totalPoints = bestSix.reduce((sum, r) => sum + r.gradePoint, 0);

        rows.push({
          studentId: student.id,
          studentCode: student.studentCode,
          fullName: student.fullName,
          subjectsSat: results.length,
          totalMarks,
          totalPoints,
          subjects: results.map((r) => ({
            subject: r.subject.name,
            mark: r.mark,
            gradePoint: r.gradePoint,
          })),
        });
      }
    }

    if (cls.gradingSystem === "LETTER") {
      // Descending by average mark — higher mark = better performance = ranked first
      rows.sort((a, b) => b.averageMark - a.averageMark);
    } else {
      // Ascending by total points — lower points = better performance = ranked first
      rows.sort((a, b) => a.totalPoints - b.totalPoints);
    }
    rows.forEach((row, index) => {
      row.position = index + 1;
    });

    res.json({ success: true, data: rows, gradingSystem: cls.gradingSystem });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to get class results" });
  }
};

// GET /api/exams/active-period (public-ish, for parent to check if button should show)
const getActivePeriod = async (req, res) => {
  try {
    const period = await prisma.examPeriod.findFirst({
      where: { schoolId: req.student.schoolId, isActive: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: period || null });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to check exam period" });
  }
};

// PUT /api/exams/classes/:classId/grading-system
const updateClassGradingSystem = async (req, res) => {
  try {
    const { gradingSystem } = req.body;
    if (!["POINTS", "LETTER"].includes(gradingSystem)) {
      return res.status(400).json({
        success: false,
        message: "gradingSystem must be POINTS or LETTER",
      });
    }
    const cls = await prisma.class.findFirst({
      where: { id: req.params.classId, schoolId: req.schoolId },
    });
    if (!cls) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });
    }
    const updated = await prisma.class.update({
      where: { id: cls.id },
      data: { gradingSystem },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to update grading system" });
  }
};

module.exports = {
  createExamPeriod,
  listExamPeriods,
  toggleExamPeriodActive,
  getSubjects,
  createSubject,
  getGradeBoundaries,
  setGradeBoundaries,
  uploadResults,
  getStudentResults,
  getClassResults,
  getActivePeriod,
  updateClassGradingSystem,
};
