const puppeteer = require("puppeteer");
const prisma = require("../config/db");
const { generateReportCardHTML } = require("../lib/reportCardTemplate");

const downloadReportCard = async (req, res) => {
  try {
    const { studentId, term, academicYear } = req.query;
    const schoolId = req.schoolId || req.student?.schoolId;

    if (!studentId || !term || !academicYear) {
      return res
        .status(400)
        .json({ success: false, message: "Missing parameters" });
    }

    // 1. Fetch Student & School
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: {
        class: true,
        school: true,
      },
    });

    if (!student)
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });

    // 2. Fetch Exam Results (Mock data for now, you can link this to your ExamPeriod)
    // Assuming you have an ExamPeriod for this term/year, fetch results.
    const examPeriod = await prisma.examPeriod.findFirst({
      where: { schoolId, term, academicYear, examType: "END_TERM" },
    });

    let subjects = [];
    if (examPeriod) {
      const results = await prisma.examResult.findMany({
        where: { studentId, examPeriodId: examPeriod.id },
        include: { subject: true },
      });
      subjects = results.map((r) => ({
        name: r.subject.name,
        endTerm: r.mark,
        total: r.mark,
        grade: r.gradeLabel || "-",
        position: "-", // Calculate if needed
        remarks: r.mark > 50 ? "Good work" : "Needs improvement",
        test1: "-",
        test2: "-",
      }));
    }

    // 3. Calculate Summary (Basic)
    const summary = {
      totalStudents: await prisma.student.count({
        where: { schoolId, classId: student.classId, isActive: true },
      }),
      totalMarks: subjects.reduce((sum, s) => sum + (s.endTerm || 0), 0),
      average: subjects.length
        ? (
            subjects.reduce((sum, s) => sum + (s.endTerm || 0), 0) /
            subjects.length
          ).toFixed(1)
        : 0,
      aggregate: "TBD",
      position: "TBD",
      overallGrade: "TBD",
      result: "PROMOTED",
      classTeacherComment: "",
      headTeacherComment: "",
    };

    // 4. Generate HTML
    const html = generateReportCardHTML({
      student,
      school: student.school,
      term,
      academicYear,
      subjects,
      summary,
    });

    // 5. Launch Puppeteer and generate PDF
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"], // Required for Linux servers
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

    // 6. Send PDF to client
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
