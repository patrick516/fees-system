const puppeteer = require("puppeteer");
const prisma = require("../config/db");
const { generateReportCardHTML } = require("../lib/reportCardTemplate");

//  Helper: Map Letter grades to Aggregate Points
const letterToAggregate = (label) => {
  const map = { A: 1, B: 2, C: 3, D: 4, F: 5 };
  return map[label] || 5;
};

//  Helper: Check if a subject is English
const isEnglish = (subjectName) => {
  return subjectName.toLowerCase().trim().includes("english");
};

//  Helper: Compute Best 6 with English compulsory
const computeBest6 = (results) => {
  if (results.length === 0) return { best6: [], totalPoints: 0 };
  const withPoints = results.filter((r) => r.gradePoint !== null);
  const englishResult = withPoints.find((r) => isEnglish(r.subject.name || ""));
  const sorted = [...withPoints].sort((a, b) => a.gradePoint - b.gradePoint);
  let best6 = [];
  if (englishResult) {
    best6 = [
      englishResult,
      ...sorted.filter((r) => r.id !== englishResult.id).slice(0, 5),
    ];
  } else {
    best6 = sorted.slice(0, 6);
  }
  const totalPoints = best6.reduce((sum, r) => sum + r.gradePoint, 0);
  return { best6, totalPoints };
};

const downloadReportCard = async (req, res) => {
  try {
    const { studentId, term, academicYear } = req.query;
    const schoolId = req.schoolId || req.student?.schoolId;

    if (!studentId || !term || !academicYear) {
      return res
        .status(400)
        .json({ success: false, message: "Missing parameters" });
    }

    //  SECURITY CHECK
    if (req.userType === "PARENT" && req.student.id !== studentId) {
      return res
        .status(403)
        .json({ success: false, message: "Access denied." });
    }

    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: { class: true, school: true },
    });

    if (!student)
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });

    const examPeriod = await prisma.examPeriod.findFirst({
      where: { schoolId, term, academicYear },
      orderBy: { createdAt: "desc" },
    });

    if (!examPeriod) {
      return res.status(404).json({
        success: false,
        message: "No exam period found for this term",
      });
    }

    // ==================== RANKING LOGIC ====================
    const classMates = await prisma.student.findMany({
      where: { schoolId, classId: student.classId, isActive: true },
      select: { id: true, fullName: true },
    });

    const metrics = [];
    const gradingSystem = student.class.gradingSystem;

    for (const s of classMates) {
      const rs = await prisma.examResult.findMany({
        where: { studentId: s.id, examPeriodId: examPeriod.id },
        include: { subject: { select: { name: true } } },
      });
      if (rs.length === 0) continue;

      if (gradingSystem === "LETTER") {
        const avg = rs.reduce((sum, r) => sum + r.mark, 0) / rs.length;
        const aggregate = rs.reduce(
          (sum, r) => sum + letterToAggregate(r.gradeLabel),
          0,
        );
        metrics.push({ studentId: s.id, averageMark: avg, aggregate });
      } else {
        const { totalPoints } = computeBest6(rs);
        metrics.push({ studentId: s.id, totalPoints });
      }
    }

    // Sort & Rank
    if (gradingSystem === "LETTER") {
      metrics.sort(
        (a, b) => b.averageMark - a.averageMark || a.aggregate - b.aggregate,
      );
    } else {
      metrics.sort((a, b) => a.totalPoints - b.totalPoints);
    }

    metrics.forEach((m, index) => {
      if (index === 0) m.position = 1;
      else {
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

    // ==================== FETCH MY RESULTS ====================
    const myResults = await prisma.examResult.findMany({
      where: { studentId, examPeriodId: examPeriod.id },
      include: { subject: true },
    });

    let subjects = [];
    let totalMarks = 0;
    let overallGrade = "-";

    if (gradingSystem === "LETTER") {
      subjects = myResults.map((r) => {
        totalMarks += r.mark;
        return {
          name: r.subject.name,
          endTerm: r.mark,
          total: r.mark,
          grade: r.gradeLabel || "-",
          remarks:
            r.mark >= 70
              ? "Excellent"
              : r.mark >= 50
                ? "Good"
                : "Needs improvement",
          test1: "-",
          test2: "-",
          position: "-",
        };
      });
      const avg = myResults.length > 0 ? totalMarks / myResults.length : 0;
      const letterBoundaries = await prisma.gradeBoundary.findMany({
        where: { schoolId, system: "LETTER" },
      });
      const match = letterBoundaries.find(
        (b) => avg >= b.minPercent && avg <= b.maxPercent + 0.99,
      );
      overallGrade = match ? match.gradeLabel : "-";
    } else {
      const { best6, totalPoints } = computeBest6(myResults);
      const best6Ids = new Set(best6.map((r) => r.id));
      subjects = myResults.map((r) => {
        totalMarks += r.mark;
        return {
          name: r.subject.name,
          endTerm: r.mark,
          total: r.mark,
          grade: r.gradePoint ? `Point ${r.gradePoint}` : "-",
          remarks: best6Ids.has(r.id) ? "Counted in Best 6" : "",
          test1: "-",
          test2: "-",
          position: "-",
        };
      });
      overallGrade = totalPoints;
    }

    const summary = {
      totalStudents: classSize,
      totalMarks,
      average:
        myResults.length > 0 ? (totalMarks / myResults.length).toFixed(1) : 0,
      aggregate: "-",
      position: position,
      overallGrade: overallGrade,
      result: "PROMOTED",
      classTeacherComment: "",
      headTeacherComment: "",
    };

    const html = generateReportCardHTML({
      student,
      school: student.school,
      term,
      academicYear,
      subjects,
      summary,
    });

    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: "new",
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
    });
    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Report_${student.studentCode}_${term}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (error) {
    console.error("PDF Generation Error:", error);
    res.status(500).json({ success: false, message: "Failed to generate PDF" });
  }
};

module.exports = { downloadReportCard };
