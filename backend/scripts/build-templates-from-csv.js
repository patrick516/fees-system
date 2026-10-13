// Builds exam templates from a CSV dumped via psql.
// Use when Node can't reach Neon directly.
//
//   1. psql ... -c "\copy (...) TO 'uploads/neon_students.csv' WITH CSV HEADER;"
//   2. node scripts/build-templates-from-csv.js
//
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
  return Math.round(40 + (x - Math.floor(x)) * 55);
};

const csvPath = path.join(__dirname, "..", "uploads", "neon_students.csv");
if (!fs.existsSync(csvPath)) {
  console.error("✗ Missing file:", csvPath);
  console.error("  Run the psql \\copy command first.");
  process.exit(1);
}

const raw = fs.readFileSync(csvPath, "utf8");
const lines = raw.trim().split("\n");
const headers = lines[0].split(",");
const rows = lines.slice(1).map((line) => {
  // Simple CSV split — our data has no commas in names
  const parts = line.split(",");
  return Object.fromEntries(headers.map((h, i) => [h, parts[i]]));
});

// Group by class
const classes = new Map();
for (const r of rows) {
  if (!classes.has(r.class_name)) {
    classes.set(r.class_name, {
      name: r.class_name,
      level: parseInt(r.level),
      gradingSystem: r.gradingSystem,
      students: [],
    });
  }
  classes.get(r.class_name).students.push({
    code: r.studentCode,
    name: r.fullName,
  });
}

const outDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

let count = 0;
for (const cls of classes.values()) {
  const isSenior = cls.gradingSystem === "POINTS";
  const subjects = isSenior ? SUBJECTS_SENIOR : SUBJECTS_JUNIOR;
  const headers = ["Student ID", "Student Name", ...subjects];

  const dataRows = cls.students.map((s, i) => {
    const marks = subjects.map((_, j) =>
      randomMark(i * 31 + j * 17 + cls.level),
    );
    return [s.code, s.name, ...marks];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
  ws["!cols"] = headers.map((_, i) => ({ wch: i < 2 ? 22 : 16 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, cls.name);

  const safe = cls.name.replace(/\s+/g, "");
  const file = path.join(outDir, `${safe}_EndOfTerm1_2026.xlsx`);
  XLSX.writeFile(wb, file);

  console.log(
    `✓ ${safe}_EndOfTerm1_2026.xlsx  (${cls.students.length} students, ${subjects.length} subjects)`,
  );
  count++;
}

console.log(`\n✓ ${count} file(s) written to ${outDir}\n`);
