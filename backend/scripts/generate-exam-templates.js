// One-time utility — generates 4 exam upload sheets, one per class,
// pre-filled with each class's enrolled students + subject columns.
//
// Run from backend/:
//   node scripts/generate-exam-templates.js
//
// Uses the class-aware student codes from the current seed:
//   SPP-F{1..4}-2026-{001..020}

const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");

const SUBJECTS_JUNIOR = [
  "Mathematics",
  "English",
  "Biology",
  "Geography",
  "History",
  "Bible Knowledge",
  "Chichewa",
];

const SUBJECTS_SENIOR = [
  "Mathematics",
  "English",
  "Biology",
  "Physical Science",
  "Geography",
  "History",
  "Bible Knowledge",
  "Chichewa",
];

// Marks are percentages (0–100). Order matches the subject list for that class.
// They're chosen to produce a realistic spread of grades and rankings.
const sheets = [
  // ===================== FORM 1 (LETTER) =====================
  // 7 subjects: Maths, Eng, Bio, Geo, Hist, Bible, Chichewa
  // Ranking target (highest avg = 1st): Faith, Roosevelt, Grace, Emmanuel, Dalitso
  {
    className: "Form 1",
    fileName: "Form1_EndOfTerm1_2026.xlsx",
    subjects: SUBJECTS_JUNIOR,
    students: [
      {
        id: "SPP-F1-2026-001",
        name: "Roosevelt Chisomo",
        marks: [82, 78, 80, 75, 85, 70, 88], // avg 79.7
      },
      {
        id: "SPP-F1-2026-002",
        name: "Emmanuel Kachale",
        marks: [55, 60, 58, 62, 65, 70, 60], // avg 61.4
      },
      {
        id: "SPP-F1-2026-003",
        name: "Grace Chunga",
        marks: [72, 68, 75, 70, 65, 78, 60], // avg 69.7
      },
      {
        id: "SPP-F1-2026-004",
        name: "Dalitso Nkhoma",
        marks: [45, 50, 55, 48, 52, 60, 45], // avg 50.7
      },
      {
        id: "SPP-F1-2026-005",
        name: "Faith Msukwa",
        marks: [88, 92, 85, 90, 88, 85, 92], // avg 88.6 (top of class)
      },
    ],
  },

  // ===================== FORM 2 (LETTER) =====================
  // Ranking target: Ruth, Innocent, Memory, Chisomo, Patrick
  {
    className: "Form 2",
    fileName: "Form2_EndOfTerm1_2026.xlsx",
    subjects: SUBJECTS_JUNIOR,
    students: [
      {
        id: "SPP-F2-2026-006",
        name: "Chisomo Mvula",
        marks: [65, 70, 62, 68, 60, 72, 55], // avg 64.6
      },
      {
        id: "SPP-F2-2026-007",
        name: "Innocent Chimwendo",
        marks: [78, 80, 82, 75, 80, 78, 75], // avg 78.3
      },
      {
        id: "SPP-F2-2026-008",
        name: "Ruth Kalua",
        marks: [90, 88, 92, 85, 88, 92, 90], // avg 89.3 (top of class)
      },
      {
        id: "SPP-F2-2026-009",
        name: "Patrick Nyasulu",
        marks: [55, 60, 58, 62, 65, 70, 60], // avg 61.4
      },
      {
        id: "SPP-F2-2026-010",
        name: "Memory Chizuma",
        marks: [72, 68, 75, 70, 65, 78, 60], // avg 69.7
      },
    ],
  },

  // ===================== FORM 3 (POINTS) =====================
  // 8 subjects: Maths, Eng, Bio, Physical Science, Geo, Hist, Bible, Chichewa
  // Best 6 counted. Lower total points = better.
  // Ranking target: Joyce (6pts), John (8pts), Wisdom (14pts), Thokozani (17pts), Blessings (23pts)
  {
    className: "Form 3",
    fileName: "Form3_EndOfTerm1_2026.xlsx",
    subjects: SUBJECTS_SENIOR,
    students: [
      {
        id: "SPP-F3-2026-011",
        name: "John Banda",
        marks: [85, 80, 78, 82, 75, 88, 70, 79], // points: 1,1,2,1,2,1,2,2 → best6 = 8
      },
      {
        id: "SPP-F3-2026-012",
        name: "Wisdom Nkhata",
        marks: [72, 68, 70, 65, 68, 75, 70, 68], // points: 2,3,2,3,3,2,2,3 → best6 = 14
      },
      {
        id: "SPP-F3-2026-013",
        name: "Joyce Manda",
        marks: [88, 85, 90, 82, 86, 88, 85, 90], // points: 1,1,1,1,1,1,1,1 → best6 = 6 (top)
      },
      {
        id: "SPP-F3-2026-014",
        name: "Thokozani Phiri",
        marks: [60, 65, 62, 68, 62, 70, 65, 68], // points: 3,3,3,3,3,2,3,3 → best6 = 17
      },
      {
        id: "SPP-F3-2026-015",
        name: "Blessings Tembo",
        marks: [45, 50, 48, 52, 55, 60, 50, 55], // points: 5,4,5,4,4,3,4,4 → best6 = 23
      },
    ],
  },

  // ===================== FORM 4 (POINTS) =====================
  // Ranking target: Mphatso (6pts), Tiyamike (7pts), Grace (14pts), Chimwemwe (17pts), Yankho (23pts)
  {
    className: "Form 4",
    fileName: "Form4_EndOfTerm1_2026.xlsx",
    subjects: SUBJECTS_SENIOR,
    students: [
      {
        id: "SPP-F4-2026-016",
        name: "Grace Mary Phiri",
        marks: [72, 68, 75, 70, 65, 78, 60, 68], // points: 2,3,2,2,3,2,3,3 → best6 = 14
      },
      {
        id: "SPP-F4-2026-017",
        name: "Mphatso Banda",
        marks: [88, 90, 85, 92, 88, 85, 90, 92], // points: 1,1,1,1,1,1,1,1 → best6 = 6 (top)
      },
      {
        id: "SPP-F4-2026-018",
        name: "Chimwemwe Mkandawire",
        marks: [55, 60, 58, 62, 65, 70, 60, 65], // points: 4,3,4,3,3,2,3,3 → best6 = 17
      },
      {
        id: "SPP-F4-2026-019",
        name: "Tiyamike Gondwe",
        marks: [78, 82, 80, 75, 82, 85, 78, 80], // points: 2,1,1,2,1,1,2,1 → best6 = 7
      },
      {
        id: "SPP-F4-2026-020",
        name: "Yankho Chirambo",
        marks: [45, 50, 48, 52, 55, 60, 50, 55], // points: 5,4,5,4,4,3,4,4 → best6 = 23
      },
    ],
  },
];

const outDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

let totalStudents = 0;

sheets.forEach((sheet) => {
  const headers = ["Student ID", "Student Name", ...sheet.subjects];
  const rows = sheet.students.map((s) => [s.id, s.name, ...s.marks]);
  const data = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Column widths for readability
  ws["!cols"] = headers.map((h, i) => ({
    wch: i < 2 ? 22 : 16,
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheet.className);

  const outPath = path.join(outDir, sheet.fileName);
  XLSX.writeFile(wb, outPath);

  totalStudents += sheet.students.length;
  console.log(
    `✓ ${sheet.fileName}  (${sheet.students.length} students, ${sheet.subjects.length} subjects)`,
  );
});

console.log(`\n${totalStudents} students across ${sheets.length} sheets`);
console.log(`Files written to: ${outDir}\n`);
console.log("Next steps:");
console.log(
  "  1. In the admin UI, create an Exam Period (e.g. End of Term 1 2026)",
);
console.log("  2. Go to Exam Results → Upload Class Results");
console.log("  3. Pick the period + class, then upload the matching file");
console.log("  4. Repeat for each class");
