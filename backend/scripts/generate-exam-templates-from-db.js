// Generates exam upload templates by reading actual students from the database.
// Always matches the current DB state — no more stale IDs after resets.
//
// Run from backend/:
//   node scripts/generate-exam-templates-from-db.js

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");

const prisma = new PrismaClient();

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

// Deterministic-ish marks so results are predictable but varied
const randomMark = (seed) => {
  const x = Math.sin(seed) * 10000;
  const frac = x - Math.floor(x);
  return Math.round(40 + frac * 55); // 40–95
};

async function main() {
  const school = await prisma.school.findFirst();
  if (!school) throw new Error("No school found. Run seed first.");

  const classes = await prisma.class.findMany({
    where: { schoolId: school.id, isActive: true },
    orderBy: { level: "asc" },
  });

  const outDir = path.join(__dirname, "..", "uploads");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (const cls of classes) {
    const students = await prisma.student.findMany({
      where: { schoolId: school.id, classId: cls.id, isActive: true },
      orderBy: { studentCode: "asc" },
    });

    if (students.length === 0) {
      console.log(`⊘ ${cls.name}: no students — skipped`);
      continue;
    }

    const isSenior = cls.gradingSystem === "POINTS";
    const subjects = isSenior ? SUBJECTS_SENIOR : SUBJECTS_JUNIOR;
    const headers = ["Student ID", "Student Name", ...subjects];

    const rows = students.map((s, i) => {
      const marks = subjects.map((_, j) =>
        randomMark(i * 31 + j * 17 + cls.level),
      );
      return [s.studentCode, s.fullName, ...marks];
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = headers.map((_, i) => ({ wch: i < 2 ? 22 : 16 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, cls.name);

    const safeName = cls.name.replace(/\s+/g, "");
    const fileName = `${safeName}_EndOfTerm1_2026.xlsx`;
    XLSX.writeFile(wb, path.join(outDir, fileName));

    console.log(
      `✓ ${fileName}  (${students.length} students, ${subjects.length} subjects) [${cls.gradingSystem}]`,
    );
  }

  console.log(`\nFiles written to: ${outDir}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
