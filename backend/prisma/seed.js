const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log(" Seeding database...");

  // Create Platform
  const platform = await prisma.platform.upsert({
    where: { id: "platform-001" },
    update: {},
    create: {
      id: "platform-001",
      name: "SchoolPay Malawi",
      email: "admin@schoolpay.mw",
      phone: "+265999000000",
    },
  });
  console.log(" Platform created");

  // Create School
  const school = await prisma.school.upsert({
    where: { id: "school-001" },
    update: {},
    create: {
      id: "school-001",
      platformId: platform.id,
      name: "St Peters Private School",
      address: "Machinjiri, Blantyre",
      city: "Blantyre",
      phone: "+265888111222",
      email: "info@stpeters.mw",
      isActive: true,
      subscriptionPaid: true,
    },
  });
  console.log(" School created");

  // Create Classes
  const classes = await Promise.all([
    prisma.class.upsert({
      where: { id: "class-001" },
      update: {},
      create: {
        id: "class-001",
        schoolId: school.id,
        name: "Standard 1",
        level: 1,
      },
    }),
    prisma.class.upsert({
      where: { id: "class-002" },
      update: {},
      create: {
        id: "class-002",
        schoolId: school.id,
        name: "Standard 2",
        level: 2,
      },
    }),
    prisma.class.upsert({
      where: { id: "class-003" },
      update: {},
      create: {
        id: "class-003",
        schoolId: school.id,
        name: "Form 1",
        level: 3,
      },
    }),
    prisma.class.upsert({
      where: { id: "class-004" },
      update: {},
      create: {
        id: "class-004",
        schoolId: school.id,
        name: "Form 2",
        level: 4,
      },
    }),
  ]);
  console.log(" Classes created");

  // Create Admin Staff
  const adminPassword = await bcrypt.hash("Admin@2025", 12);
  const admin = await prisma.staff.upsert({
    where: { email: "admin@stpeters.mw" },
    update: {},
    create: {
      schoolId: school.id,
      fullName: "School Administrator",
      email: "admin@stpeters.mw",
      phone: "+265888000001",
      passwordHash: adminPassword,
      role: "SCHOOL_ADMIN",
    },
  });
  console.log(
    " Admin created - email: admin@stpeters.mw | password: Admin@2025",
  );

  // Create Bursar
  const bursarPassword = await bcrypt.hash("Bursar@2025", 12);
  const bursar = await prisma.staff.upsert({
    where: { email: "bursar@stpeters.mw" },
    update: {},
    create: {
      schoolId: school.id,
      fullName: "Mary Chirwa",
      email: "bursar@stpeters.mw",
      phone: "+265888000002",
      passwordHash: bursarPassword,
      role: "BURSAR",
    },
  });
  console.log(
    " Bursar created - email: bursar@stpeters.mw | password: Bursar@2025",
  );

  // Create Test Students
  const student1 = await prisma.student.upsert({
    where: { studentCode: "STP-2025-001" },
    update: {},
    create: {
      schoolId: school.id,
      classId: classes[2].id, // Form 1
      studentCode: "STP-2025-001",
      fullName: "John Banda",
      dateOfBirth: new Date("2010-03-15"),
      gender: "MALE",
      parentName: "Mary Banda",
      parentPhone: "+265999123456",
      academicYear: "2025",
    },
  });

  const student2 = await prisma.student.upsert({
    where: { studentCode: "STP-2025-002" },
    update: {},
    create: {
      schoolId: school.id,
      classId: classes[3].id,
      studentCode: "STP-2025-002",
      fullName: "Grace Phiri",
      dateOfBirth: new Date("2009-07-22"),
      gender: "FEMALE",
      parentName: "James Phiri",
      parentPhone: "+265888654321",
      academicYear: "2025",
    },
  });
  console.log(" Test students created");

  console.log(`
  ================================
   Seed complete!

  School: St Peters Private School
  Admin login: admin@stpeters.mw / Admin@2025
  Bursar login: bursar@stpeters.mw / Bursar@2025

  Test Students:
  - John Banda | ID: STP-2025-001 | DOB: 1010-03-15
  - Grace Phiri | ID: STP-2025-002 | DOB: 2009-07-22
  ================================
  `);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
