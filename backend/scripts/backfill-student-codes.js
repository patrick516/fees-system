// One-time migration script — regenerates all student codes with the new
// class-aware format, preserving old codes in formerStudentCodes.
//
// Run once from the backend folder:
//   node scripts/backfill-student-codes.js

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const buildSchoolPrefix = (name) =>
  name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);

const buildClassTag = (name, level) =>
  `${name.trim().charAt(0).toUpperCase()}${level}`;

const buildYearTag = (year) => String(year).split("-")[0];

async function main() {
  const schools = await prisma.school.findMany();

  for (const school of schools) {
    console.log(`\n📚 ${school.name}`);

    const students = await prisma.student.findMany({
      where: { schoolId: school.id },
      include: { class: true },
      orderBy: { createdAt: "asc" },
    });

    if (students.length === 0) {
      console.log("  (no students)");
      continue;
    }

    // ============ PASS 1: move all codes to temporary unique values ============
    // This avoids unique-constraint collisions during the migration
    for (const s of students) {
      await prisma.student.update({
        where: { id: s.id },
        data: { studentCode: `MIGRATING-${s.id}` },
      });
    }

    // ============ PASS 2: assign new codes ============
    let seq = 1;
    for (const s of students) {
      const prefix = buildSchoolPrefix(school.name);
      const classTag = buildClassTag(s.class.name, s.class.level);
      const yearTag = buildYearTag(s.academicYear);
      const paddedSeq = String(seq).padStart(3, "0");
      const newCode = `${prefix}-${classTag}-${yearTag}-${paddedSeq}`;

      await prisma.student.update({
        where: { id: s.id },
        data: {
          studentCode: newCode,
          formerStudentCodes: { push: s.studentCode },
        },
      });

      console.log(`  ${s.studentCode}  →  ${newCode}`);
      seq++;
    }
  }

  console.log("\n✅ Backfill complete\n");
}

main()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
