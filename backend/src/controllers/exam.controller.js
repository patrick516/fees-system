const prisma = require("../config/db");
const XLSX = require("xlsx");
const { uploadToCloudinary } = require("../lib/cloudinary");

// Look up the grade (point and/or label) for a given percentage mark
const resolveGrade = (mark, boundaries) => {
  // 🎯 Add +0.99 to the maxPercent to handle decimals (e.g., 69.9%)
  const match = boundaries.find(
    (b) => mark >= b.minPercent && mark <= b.maxPercent + 0.99,
  );
  return {
    gradePoint: match ? match.gradePoint : null,
    gradeLabel: match ? match.gradeLabel : null,
  };
};

// 🎯 Map Letter grades to Aggregate Points for tie-breaking
const letterToAggregate = (label) => {
  const map = { A: 1, B: 2, C: 3, D: 4, F: 5 };
  return map[label] || 5; // Default to 5 for unknowns
};

// 🎯 Helper: Check if a subject is English
const isEnglish = (subjectName) => {
  return subjectName.toLowerCase().trim().includes("english");
};

// 🎯 Helper: Compute Best 6 with English compulsory (for POINTS system)
// Returns { best6, totalPoints, englishIncluded }
const computeBest6 = (results) => {
  if (results.length === 0) {
    return { best6: [], totalPoints: 0, englishIncluded: false };
  }

  // Filter only subjects with valid gradePoint
  const withPoints = results.filter(
    (r) => r.gradePoint !== null && r.gradePoint !== undefined,
  );

  // Find the English subject
  const englishResult = withPoints.find((r) => isEnglish(r.subject.name || ""));

  // Sort all by gradePoint ascending (lower is better)
  const sorted = [...withPoints].sort((a, b) => a.gradePoint - b.gradePoint);

  let best6 = [];
  let englishIncluded = false;

  if (englishResult) {
    // 🎯 English is compulsory: start with English, then take best 5 of the rest
    englishIncluded = true;
    const others = sorted.filter((r) => r.id !== englishResult.id);
    best6 = [englishResult, ...others.slice(0, 5)];
  } else {
    // 🎯 No English found: fall back to pure best 6
    best6 = sorted.slice(0, 6);
  }

  const totalPoints = best6.reduce((sum, r) => sum + r.gradePoint, 0);

  return { best6, totalPoints, englishIncluded };
};

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

// ==================== UPLOAD RESULTS ====================

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

    const examPeriod = await prisma.examPeriod.findFirst({
      where: { id: examPeriodId, schoolId: req.schoolId },
    });
    if (!examPeriod) {
      return res.status(400).json({
        success: false,
        message:
          "The selected exam period was not found. Please refresh the page and select a valid exam period.",
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

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

    if (rows.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Sheet is empty" });
    }

    const columns = Object.keys(rows[0]);
    const headerLower = columns.map((c) => c.toLowerCase().trim());

    const idColIdx = headerLower.findIndex((h) => h.includes("id"));
    const nameColIdx = headerLower.findIndex((h) => h.includes("name"));

    let idCol = idColIdx !== -1 ? columns[idColIdx] : null;
    let nameCol = nameColIdx !== -1 ? columns[nameColIdx] : null;

    if (!idCol && !nameCol) {
      idCol = columns[0];
    }

    const excludedCols = new Set([idCol, nameCol].filter(Boolean));
    const subjectColumns = columns.filter((c) => !excludedCols.has(c));

    // 🎯 Warn if no English column is found in the upload
    const hasEnglishColumn = subjectColumns.some((c) => isEnglish(String(c)));

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
    let pendingCount = 0;
    const errors = [];

    for (const row of rows) {
      let student = null;

      if (idCol && row[idCol]) {
        const studentCode = String(row[idCol]).trim();
        student = await prisma.student.findFirst({
          where: { schoolId: req.schoolId, studentCode },
        });
        if (!student) {
          errors.push(`Student ID ${studentCode} not found`);
          continue;
        }
        if (student.classId !== classId) {
          errors.push(
            `Student ${studentCode} (${student.fullName}) is not in the selected class — skipped`,
          );
          continue;
        }
      } else if (nameCol && row[nameCol]) {
        const rawName = String(row[nameCol]).trim();
        const matches = await prisma.student.findMany({
          where: {
            schoolId: req.schoolId,
            classId,
            fullName: { equals: rawName, mode: "insensitive" },
          },
        });

        if (matches.length === 0) {
          errors.push(`"${rawName}" not found in this class`);
          continue;
        }

        if (matches.length === 1) {
          student = matches[0];
        } else {
          const marksBySubjectId = {};
          for (const subjectName of subjectColumns) {
            const rawMark = row[subjectName];
            if (rawMark === null || rawMark === undefined || rawMark === "")
              continue;
            const mark = parseFloat(rawMark);
            if (isNaN(mark)) continue;
            marksBySubjectId[subjectMap[subjectName]] = mark;
          }

          await prisma.pendingExamRow.create({
            data: {
              schoolId: req.schoolId,
              classId,
              examPeriodId,
              rawName,
              marks: marksBySubjectId,
              candidateStudentIds: matches.map((m) => m.id),
            },
          });

          pendingCount++;
          errors.push(
            `"${rawName}" matches ${matches.length} students in this class — added to Pending Matches for you to resolve manually`,
          );
          continue;
        }
      } else {
        errors.push("A row had neither a Student ID nor a Name — skipped");
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
          pendingCount,
          errors,
          sourceFileUrl,
          englishIncluded: hasEnglishColumn, // 🎯 Track for audit
        },
      },
    });

    // 🎯 Warn in the response if English was missing
    const warningMessage =
      !hasEnglishColumn && cls.gradingSystem === "POINTS"
        ? " ⚠️ Note: English column was not found in this upload. Best-6 will use pure top subjects without the English requirement."
        : "";

    res.json({
      success: true,
      message: `Processed ${processed} student(s)${pendingCount ? `, ${pendingCount} pending manual match(es)` : ""}${errors.length ? `, ${errors.length} issue(s)` : ""}${warningMessage}`,
      data: {
        processed,
        pendingCount,
        errors,
        sourceFileUrl,
        englishIncluded: hasEnglishColumn, // 🎯 Frontend can show warning
      },
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to upload results" });
  }
};

// ==================== PENDING NAME MATCHES ====================

const getPendingRows = async (req, res) => {
  try {
    const { classId, examPeriodId } = req.query;
    const where = { schoolId: req.schoolId, resolvedStudentId: null };
    if (classId) where.classId = classId;
    if (examPeriodId) where.examPeriodId = examPeriodId;

    const pending = await prisma.pendingExamRow.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const result = [];
    for (const row of pending) {
      const candidates = await prisma.student.findMany({
        where: { id: { in: row.candidateStudentIds } },
        select: { id: true, studentCode: true, fullName: true },
      });

      const subjectIds = Object.keys(row.marks);
      const subjects = await prisma.subject.findMany({
        where: { id: { in: subjectIds } },
        select: { id: true, name: true },
      });
      const subjectNameMap = Object.fromEntries(
        subjects.map((s) => [s.id, s.name]),
      );

      result.push({
        id: row.id,
        rawName: row.rawName,
        candidates,
        marks: Object.entries(row.marks).map(([subjectId, mark]) => ({
          subject: subjectNameMap[subjectId] || "Unknown",
          mark,
        })),
        createdAt: row.createdAt,
      });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to get pending matches" });
  }
};

const resolvePendingRow = async (req, res) => {
  try {
    const { studentId } = req.body;
    if (!studentId) {
      return res
        .status(400)
        .json({ success: false, message: "studentId is required" });
    }

    const pending = await prisma.pendingExamRow.findFirst({
      where: {
        id: req.params.id,
        schoolId: req.schoolId,
        resolvedStudentId: null,
      },
    });
    if (!pending) {
      return res
        .status(404)
        .json({ success: false, message: "Pending match not found" });
    }
    if (!pending.candidateStudentIds.includes(studentId)) {
      return res.status(400).json({
        success: false,
        message:
          "That student wasn't one of the matched candidates for this row",
      });
    }

    const cls = await prisma.class.findFirst({
      where: { id: pending.classId },
    });
    const boundaries = await prisma.gradeBoundary.findMany({
      where: { schoolId: req.schoolId, system: cls.gradingSystem },
    });

    const marks = pending.marks;
    for (const [subjectId, mark] of Object.entries(marks)) {
      const { gradePoint, gradeLabel } = resolveGrade(mark, boundaries);
      await prisma.examResult.upsert({
        where: {
          studentId_subjectId_examPeriodId: {
            studentId,
            subjectId,
            examPeriodId: pending.examPeriodId,
          },
        },
        update: { mark, gradePoint, gradeLabel },
        create: {
          schoolId: req.schoolId,
          studentId,
          subjectId,
          examPeriodId: pending.examPeriodId,
          mark,
          gradePoint,
          gradeLabel,
        },
      });
    }

    await prisma.pendingExamRow.update({
      where: { id: pending.id },
      data: { resolvedStudentId: studentId, resolvedAt: new Date() },
    });

    res.json({ success: true, message: "Resolved and results saved" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to resolve pending match" });
  }
};

const discardPendingRow = async (req, res) => {
  try {
    const pending = await prisma.pendingExamRow.findFirst({
      where: { id: req.params.id, schoolId: req.schoolId },
    });
    if (!pending) {
      return res
        .status(404)
        .json({ success: false, message: "Pending match not found" });
    }
    await prisma.pendingExamRow.delete({ where: { id: pending.id } });
    res.json({ success: true, message: "Discarded" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to discard" });
  }
};

// ==================== STUDENT RESULTS ====================

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

    // 🎯 Compute class ranking with tie-breaker
    const classMates = await prisma.student.findMany({
      where: {
        schoolId: req.student.schoolId,
        classId: student.classId,
        isActive: true,
      },
      select: { id: true, fullName: true },
    });

    const metrics = [];

    for (const s of classMates) {
      const rs = await prisma.examResult.findMany({
        where: { studentId: s.id, examPeriodId: period.id },
        include: { subject: { select: { name: true } } }, // 🎯 Need name for English check
      });
      if (rs.length === 0) continue;

      if (gradingSystem === "LETTER") {
        const avg = rs.reduce((sum, r) => sum + r.mark, 0) / rs.length;
        const aggregate = rs.reduce(
          (sum, r) => sum + letterToAggregate(r.gradeLabel),
          0,
        );
        metrics.push({
          studentId: s.id,
          fullName: s.fullName,
          averageMark: avg,
          aggregate,
          displayValue: Math.round(avg * 10) / 10,
        });
      } else {
        // 🎯 Use the new Best 6 with English compulsory
        const { totalPoints } = computeBest6(rs);
        metrics.push({
          studentId: s.id,
          fullName: s.fullName,
          totalPoints,
          displayValue: totalPoints,
        });
      }
    }

    // 🎯 Sort & Assign Ranks
    if (gradingSystem === "LETTER") {
      metrics.sort((a, b) => {
        if (b.averageMark !== a.averageMark) {
          return b.averageMark - a.averageMark;
        }
        return a.aggregate - b.aggregate;
      });
    } else {
      metrics.sort((a, b) => a.totalPoints - b.totalPoints);
    }

    // 🎯 Standard Competition Ranking (1, 1, 3)
    metrics.forEach((m, index) => {
      if (index === 0) {
        m.position = 1;
      } else {
        const prev = metrics[index - 1];
        const isTie =
          gradingSystem === "LETTER"
            ? prev.averageMark === m.averageMark &&
              prev.aggregate === m.aggregate
            : prev.totalPoints === m.totalPoints;
        m.position = isTie ? prev.position : index + 1;
      }
    });

    const myMetric = metrics.find((m) => m.studentId === studentId);
    const position = myMetric ? myMetric.position : null;
    const classSize = metrics.length;

    const topThree = metrics.slice(0, 3).map((m) => ({
      position: m.position,
      fullName: m.fullName,
      value: m.displayValue,
      isCurrentStudent: m.studentId === studentId,
    }));

    const percentile =
      position && classSize > 0
        ? Math.max(1, Math.round((position / classSize) * 100))
        : null;

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
      position,
      classSize,
      percentile,
      topThree,
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

    // 🎯 POINTS — Best 6 with English compulsory
    const { best6, totalPoints, englishIncluded } = computeBest6(results);
    const bestSixIds = new Set(best6.map((r) => r.id));

    res.json({
      success: true,
      data: {
        ...baseData,
        results: results.map((r) => ({
          subject: r.subject.name,
          mark: r.mark,
          gradePoint: r.gradePoint,
          countedInTotal: bestSixIds.has(r.id),
          isEnglish: isEnglish(r.subject.name || ""), // 🎯 Highlight English
        })),
        totalPoints,
        subjectsCounted: best6.length,
        englishIncluded, // 🎯 Flag for frontend
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to get results" });
  }
};

// ==================== CLASS RESULTS ====================

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
    const isLowerForm =
      cls.level <= 2 ||
      cls.name.toLowerCase().includes("form 1") ||
      cls.name.toLowerCase().includes("form 2");
    const requiredGrading = isLowerForm ? "LETTER" : "POINTS";

    if (cls.gradingSystem !== requiredGrading) {
      return res.status(400).json({
        success: false,
        message: `Invalid grading system. ${cls.name} must use ${requiredGrading === "LETTER" ? "Letter Grades" : "Points"}. Please update the class settings before uploading.`,
      });
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

      if (results.length === 0) continue;

      const totalMarks = results.reduce((sum, r) => sum + r.mark, 0);

      if (cls.gradingSystem === "LETTER") {
        const average = totalMarks / results.length;
        const { gradeLabel: overallGrade } = resolveGrade(
          average,
          letterBoundaries,
        );
        const aggregate = results.reduce(
          (sum, r) => sum + letterToAggregate(r.gradeLabel),
          0,
        );
        rows.push({
          studentId: student.id,
          studentCode: student.studentCode,
          fullName: student.fullName,
          subjectsSat: results.length,
          totalMarks,
          averageMark: Math.round(average * 10) / 10,
          overallGrade,
          aggregate,
          subjects: results.map((r) => ({
            subject: r.subject.name,
            mark: r.mark,
            gradeLabel: r.gradeLabel,
          })),
        });
      } else {
        // 🎯 Use the new Best 6 with English compulsory
        const { best6, totalPoints, englishIncluded } = computeBest6(results);
        const bestSixIds = new Set(best6.map((r) => r.id));

        rows.push({
          studentId: student.id,
          studentCode: student.studentCode,
          fullName: student.fullName,
          subjectsSat: results.length,
          totalMarks,
          totalPoints,
          englishIncluded, // 🎯 Flag
          subjects: results.map((r) => ({
            subject: r.subject.name,
            mark: r.mark,
            gradePoint: r.gradePoint,
            countedInTotal: bestSixIds.has(r.id),
            isEnglish: isEnglish(r.subject.name || ""),
          })),
        });
      }
    }

    // 🎯 Sort & Assign Ranks
    if (cls.gradingSystem === "LETTER") {
      rows.sort((a, b) => {
        if (b.averageMark !== a.averageMark) {
          return b.averageMark - a.averageMark;
        }
        return a.aggregate - b.aggregate;
      });
    } else {
      rows.sort((a, b) => a.totalPoints - b.totalPoints);
    }

    // 🎯 Standard Competition Ranking (1, 1, 3)
    rows.forEach((row, index) => {
      if (index === 0) {
        row.position = 1;
      } else {
        const prev = rows[index - 1];
        const isTie =
          cls.gradingSystem === "LETTER"
            ? prev.averageMark === row.averageMark &&
              prev.aggregate === row.aggregate
            : prev.totalPoints === row.totalPoints;
        row.position = isTie ? prev.position : index + 1;
      }
    });

    res.json({ success: true, data: rows, gradingSystem: cls.gradingSystem });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to get class results" });
  }
};

// ==================== ACTIVE PERIOD ====================

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

// ==================== UPDATE GRADING SYSTEM ====================

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

// ==================== UPLOAD SUMMARY ====================

const getUploadSummary = async (req, res) => {
  try {
    const { examPeriodId } = req.query;
    if (!examPeriodId) {
      return res
        .status(400)
        .json({ success: false, message: "examPeriodId is required" });
    }

    const classes = await prisma.class.findMany({
      where: { schoolId: req.schoolId, isActive: true },
      orderBy: { level: "asc" },
    });

    const summary = [];
    for (const cls of classes) {
      const uniqueStudents = await prisma.examResult.findMany({
        where: {
          examPeriodId,
          schoolId: req.schoolId,
          student: { classId: cls.id },
        },
        distinct: ["studentId"],
        select: { studentId: true },
      });
      const count = uniqueStudents.length;

      let lastUploadedAt = null;
      let sourceFileUrl = null;
      if (count > 0) {
        const latestLog = await prisma.auditLog.findFirst({
          where: {
            schoolId: req.schoolId,
            action: "EXAM_RESULTS_UPLOADED",
            entityId: examPeriodId,
            changes: { path: ["classId"], equals: cls.id },
          },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true, changes: true },
        });
        if (latestLog) {
          lastUploadedAt = latestLog.createdAt;
          sourceFileUrl = latestLog.changes?.sourceFileUrl || null;
        }
      }

      const isLowerForm =
        cls.level <= 2 ||
        cls.name.toLowerCase().includes("form 1") ||
        cls.name.toLowerCase().includes("form 2");
      const requiredGrading = isLowerForm ? "LETTER" : "POINTS";

      if (cls.gradingSystem !== requiredGrading) {
        await prisma.class.update({
          where: { id: cls.id },
          data: { gradingSystem: requiredGrading },
        });
      }

      summary.push({
        classId: cls.id,
        className: cls.name,
        gradingSystem: requiredGrading,
        hasResults: count > 0,
        studentsUploaded: count,
        lastUploadedAt,
        sourceFileUrl,
      });
    }

    res.json({ success: true, data: summary });
  } catch (err) {
    console.error("getUploadSummary error:", err);
    res.status(500).json({ success: false, message: "Failed to get summary" });
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
  getPendingRows,
  resolvePendingRow,
  discardPendingRow,
  getUploadSummary,
};
