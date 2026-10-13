// Generates exam upload templates by reading students directly via pg.
// Bypasses Prisma 7's driver adapter (which has Neon timeout issues).
//
// Run from backend/:
//   node scripts/generate-exam-templates-from-db.js

require("dotenv").config();
const { Client } = require("pg");
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

const randomMark = (seed) => {
  const x = Math.sin(seed) * 10000;
  const frac = x - Math.floor(x);
  return Math.round(40 + frac * 55);
};

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
    query_timeout: 30000,
  });

  console.log("🔌 Connecting...");
  await client.connect();
  console.log("✓ Connected");

  // School
  const schoolRes = await client.query("SELECT id, name FROM schools LIMIT 1");
  const school = schoolRes.rows[0];
  if (!school) throw new Error("No school found");
  console.log(`✓ School: ${school.name}`);

  // Classes
  const classesRes = await client.query(
    'SELECT id, name, level, "gradingSystem" FROM classes WHERE "schoolId" = $1 AND "isActive" = true ORDER BY level ASC',
    [school.id],
  );

  const outDir = path.join(__dirname, "..", "uploads");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (const cls of classesRes.rows) {
    const studentsRes = await client.query(
      'SELECT "studentCode", "fullName" FROM students WHERE "schoolId" = $1 AND "classId" = $2 AND "isActive" = true ORDER BY "studentCode" ASC',
      [school.id, cls.id],
    );

    if (studentsRes.rows.length === 0) {
      console.log(`⊘ ${cls.name}: no students — skipped`);
      continue;
    }

    const isSenior = cls.gradingSystem === "POINTS";
    const subjects = isSenior ? SUBJECTS_SENIOR : SUBJECTS_JUNIOR;
    const headers = ["Student ID", "Student Name", ...subjects];

    const rows = studentsRes.rows.map((s, i) => {
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
      `✓ ${fileName}  (${studentsRes.rows.length} students, ${subjects.length} subjects) [${cls.gradingSystem}]`,
    );
  }

  console.log(`\nFiles written to: ${outDir}\n`);
  await client.end();
}

main().catch((e) => {
  console.error("\n❌ Failed:", e.message);
  process.exit(1);
});
