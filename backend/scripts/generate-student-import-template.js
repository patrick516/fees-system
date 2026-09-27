// Generates a PRE-FILLED student import template with 20 test students.
// 5 students per class, spread across Form 1–4.
//
// Run from backend/:
//   node scripts/generate-student-import-template.js

const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");

const HEADERS = [
  "First Name",
  "Middle Name",
  "Last Name",
  "Date of Birth",
  "Gender",
  "Class",
  "Parent Name",
  "Parent Phone",
  "Parent Phone 2",
  "Parent Email",
  "Academic Year",
];

const YEAR = "2026-2027";

// 20 test students — 5 per class
const TEST_STUDENTS = [
  // ============ FORM 1 (5) ============
  [
    "Chikondi",
    "",
    "Mwale",
    "2011-04-12",
    "MALE",
    "Form 1",
    "Anna Mwale",
    "991234567",
    "",
    "",
    YEAR,
  ],
  [
    "Tadala",
    "Grace",
    "Nkhoma",
    "2011-06-08",
    "FEMALE",
    "Form 1",
    "Peter Nkhoma",
    "992345678",
    "",
    "peter.nkhoma@example.com",
    YEAR,
  ],
  [
    "Madalitso",
    "",
    "Tembo",
    "2010-11-19",
    "MALE",
    "Form 1",
    "Esnart Tembo",
    "993456789",
    "",
    "",
    YEAR,
  ],
  [
    "Mphatso",
    "Ruth",
    "Banda",
    "2011-02-27",
    "FEMALE",
    "Form 1",
    "James Banda",
    "994567890",
    "995678901",
    "",
    YEAR,
  ],
  [
    "Yamikani",
    "",
    "Chirwa",
    "2011-09-05",
    "MALE",
    "Form 1",
    "Linda Chirwa",
    "996789012",
    "",
    "linda.chirwa@example.com",
    YEAR,
  ],

  // ============ FORM 2 (5) ============
  [
    "Tiwonge",
    "",
    "Phiri",
    "2010-03-22",
    "FEMALE",
    "Form 2",
    "Mercy Phiri",
    "997890123",
    "",
    "",
    YEAR,
  ],
  [
    "Wongani",
    "James",
    "Sibande",
    "2010-07-14",
    "MALE",
    "Form 2",
    "Joseph Sibande",
    "998901234",
    "",
    "",
    YEAR,
  ],
  [
    "Patience",
    "",
    "Moyo",
    "2010-12-01",
    "FEMALE",
    "Form 2",
    "Chimwemwe Moyo",
    "999012345",
    "",
    "",
    YEAR,
  ],
  [
    "Frank",
    "",
    "Kachale",
    "2010-05-18",
    "MALE",
    "Form 2",
    "Gift Kachale",
    "991122334",
    "",
    "",
    YEAR,
  ],
  [
    "Chisomo",
    "Mary",
    "Gondwe",
    "2010-10-09",
    "FEMALE",
    "Form 2",
    "Steve Gondwe",
    "992233445",
    "993344556",
    "",
    YEAR,
  ],

  // ============ FORM 3 (5) ============
  [
    "Tamandani",
    "Precious",
    "Kamanga",
    "2009-09-30",
    "FEMALE",
    "Form 3",
    "Peter Kamanga",
    "994455667",
    "",
    "",
    YEAR,
  ],
  [
    "Blessings",
    "",
    "Nyirenda",
    "2009-11-25",
    "MALE",
    "Form 3",
    "Martha Nyirenda",
    "995566778",
    "",
    "",
    YEAR,
  ],
  [
    "Ruth",
    "Esther",
    "Kalua",
    "2009-04-07",
    "FEMALE",
    "Form 3",
    "Robert Kalua",
    "996677889",
    "",
    "robert.kalua@example.com",
    YEAR,
  ],
  [
    "Pilirani",
    "",
    "Kachala",
    "2009-08-16",
    "FEMALE",
    "Form 3",
    "Andrew Kachala",
    "997788990",
    "",
    "",
    YEAR,
  ],
  [
    "Limbani",
    "Peter",
    "Nyasulu",
    "2009-01-23",
    "MALE",
    "Form 3",
    "Linda Nyasulu",
    "998899001",
    "",
    "",
    YEAR,
  ],

  // ============ FORM 4 (5) ============
  [
    "Thandiwe",
    "",
    "Ngoma",
    "2008-05-05",
    "FEMALE",
    "Form 4",
    "Steve Ngoma",
    "999900112",
    "991011121",
    "",
    YEAR,
  ],
  [
    "Tiyamike",
    "Ruth",
    "Chizuma",
    "2008-02-14",
    "FEMALE",
    "Form 4",
    "Elton Chizuma",
    "992233114",
    "",
    "",
    YEAR,
  ],
  [
    "Mavuto",
    "",
    "Chilenga",
    "2008-09-21",
    "MALE",
    "Form 4",
    "Chrissy Chilenga",
    "993344225",
    "",
    "",
    YEAR,
  ],
  [
    "Memory",
    "Grace",
    "Manda",
    "2008-12-03",
    "FEMALE",
    "Form 4",
    "Andrew Manda",
    "994455336",
    "",
    "",
    YEAR,
  ],
  [
    "Dalitso",
    "",
    "Nkhata",
    "2008-07-11",
    "MALE",
    "Form 4",
    "Chrissy Nkhata",
    "995566447",
    "",
    "",
    YEAR,
  ],
];

const outDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const outPath = path.join(outDir, "student-import-test-data.xlsx");

// ============ SHEET 1 — STUDENTS (pre-filled) ============
const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...TEST_STUDENTS]);
ws["!cols"] = [
  { wch: 14 },
  { wch: 14 },
  { wch: 14 },
  { wch: 14 },
  { wch: 8 },
  { wch: 12 },
  { wch: 22 },
  { wch: 16 },
  { wch: 16 },
  { wch: 26 },
  { wch: 14 },
];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Students");

// ============ SHEET 2 — INSTRUCTIONS ============
const instructions = [
  ["STUDENT IMPORT — INSTRUCTIONS"],
  [""],
  ["HOW TO USE"],
  ["1. Go to the 'Students' sheet."],
  ["2. Edit or add rows as needed (one student per row, starting at row 2)."],
  ["3. Do NOT change the header row."],
  ["4. Save as .xlsx."],
  ["5. Upload via Admin → Students → Bulk Import."],
  [""],
  ["WHAT TO EXPECT"],
  ["• The preview will tell you exactly which rows are valid."],
  ["• Nothing is imported until you click 'Import' — safe to test."],
  ["• Blank rows are silently ignored."],
  [""],
  ["COLUMN RULES"],
  ["First Name", "Required. Letters only."],
  ["Middle Name", "Optional."],
  ["Last Name", "Required."],
  ["Date of Birth", "Required. Format: YYYY-MM-DD (e.g. 2010-03-15)."],
  ["Gender", "Required. Must be MALE or FEMALE (uppercase)."],
  [
    "Class",
    "Required. Must exactly match an existing class name (e.g. Form 1, Form 4).",
  ],
  ["Parent Name", "Required."],
  [
    "Parent Phone",
    "Required. 9 digits (e.g. 995049331). +265 is added automatically.",
  ],
  ["Parent Phone 2", "Optional. Same format as above."],
  ["Parent Email", "Optional."],
  ["Academic Year", "Optional. Defaults to the school's active academic year."],
  [""],
  ["TIPS"],
  ["• Copy-paste from another spreadsheet works fine."],
  [
    "• Duplicate students (same name + parent phone) are rejected automatically.",
  ],
  [
    "• If a class name doesn't match exactly, you'll see the error in the preview.",
  ],
];

const wsInfo = XLSX.utils.aoa_to_sheet(instructions);
wsInfo["!cols"] = [{ wch: 22 }, { wch: 78 }];
XLSX.utils.book_append_sheet(wb, wsInfo, "Instructions");

XLSX.writeFile(wb, outPath);

console.log(`✓ Pre-filled template created: ${outPath}`);
console.log(
  `  ${TEST_STUDENTS.length} students ready to import (5 per class).`,
);
console.log("");
console.log("Distribution:");
console.log("  Form 1: 5 students");
console.log("  Form 2: 5 students");
console.log("  Form 3: 5 students");
console.log("  Form 4: 5 students");
console.log("");
console.log("Next steps:");
console.log("  1. Upload via Admin → Students → Bulk Import");
console.log("  2. Click the upload area, choose this file");
console.log("  3. Preview shows 20 valid rows");
console.log("  4. Click Import");
console.log("");
console.log("Expected result: each class starts at 001.");
console.log("  Form 1 → SPP-F1-2026-001 ... SPP-F1-2026-005");
console.log("  Form 2 → SPP-F2-2026-001 ... SPP-F2-2026-005");
console.log("  Form 3 → SPP-F3-2026-001 ... SPP-F3-2026-005");
console.log("  Form 4 → SPP-F4-2026-001 ... SPP-F4-2026-005");
