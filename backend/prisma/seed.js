const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log(" Seeding database...");

  // ============ PLATFORM ============
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
  console.log(" Platform ready");

  // ============ SCHOOL ============
  const school = await prisma.school.upsert({
    where: { id: "school-001" },
    update: {
      name: "St Peters Private School",
      slug: "st-peters",
      motto: "Excellence Through Knowledge",
      primaryColor: "#1e3a8a",
      activeTerm: "TERM_1",
      activeAcademicYear: "2026-2027",
      activeTermStartDate: new Date("2026-09-01"),
      activeTermEndDate: new Date("2026-12-15"),
      bankAccounts: [
        {
          id: "bank-001",
          bankName: "National Bank of Malawi",
          accountName: "St Peters Private School",
          accountNumber: "1005123456",
          branch: "Blantyre",
        },
        {
          id: "bank-002",
          bankName: "Standard Bank",
          accountName: "St Peters Private School",
          accountNumber: "9012345678",
          branch: "Limbe",
        },
      ],
      airtelMoneyNumber: "+265 995 049 331",
      mpambaNumber: "+265 885 049 331",
      paymentInstructions:
        "Use your child's Student ID as the payment reference. Send the screenshot to the school office after payment.",
    },
    create: {
      id: "school-001",
      platformId: platform.id,
      name: "St Peters Private School",
      slug: "st-peters",
      address: "Machinjiri, Blantyre",
      city: "Blantyre",
      phone: "+265888111222",
      email: "info@stpeters.mw",
      motto: "Excellence Through Knowledge",
      primaryColor: "#1e3a8a",
      isActive: true,
      subscriptionPaid: true,
      activeTerm: "TERM_1",
      activeAcademicYear: "2026-2027",
      activeTermStartDate: new Date("2026-09-01"),
      activeTermEndDate: new Date("2026-12-15"),
      bankAccounts: [
        {
          id: "bank-001",
          bankName: "National Bank of Malawi",
          accountName: "St Peters Private School",
          accountNumber: "1005123456",
          branch: "Blantyre",
        },
        {
          id: "bank-002",
          bankName: "Standard Bank",
          accountName: "St Peters Private School",
          accountNumber: "9012345678",
          branch: "Limbe",
        },
      ],
      airtelMoneyNumber: "+265 995 049 331",
      mpambaNumber: "+265 885 049 331",
      paymentInstructions:
        "Use your child's Student ID as the payment reference. Send the screenshot to the school office after payment.",
    },
  });
  console.log(" School ready (active term + payment details + branding)");

  // ============ CLASSES ============
  const classData = [
    { id: "class-001", name: "Form 1", level: 1, gradingSystem: "LETTER" },
    { id: "class-002", name: "Form 2", level: 2, gradingSystem: "LETTER" },
    { id: "class-003", name: "Form 3", level: 3, gradingSystem: "POINTS" },
    { id: "class-004", name: "Form 4", level: 4, gradingSystem: "POINTS" },
  ];

  const classes = [];
  for (const c of classData) {
    const cls = await prisma.class.upsert({
      where: { id: c.id },
      update: { name: c.name, level: c.level, gradingSystem: c.gradingSystem },
      create: { ...c, schoolId: school.id },
    });
    classes.push(cls);
  }
  console.log(` Classes ready (Form 1–4)`);

  // ============ STAFF ============
  const adminPassword = await bcrypt.hash("Admin@2025", 12);
  const admin = await prisma.staff.upsert({
    where: { email: "admin@stpeters.mw" },
    update: { fullName: "Patrick Kulinji" },
    create: {
      schoolId: school.id,
      fullName: "Patrick Kulinji",
      email: "admin@stpeters.mw",
      phone: "+265888000001",
      passwordHash: adminPassword,
      role: "SCHOOL_ADMIN",
    },
  });
  console.log(" Admin ready — admin@stpeters.mw / Admin@2025");

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
  console.log(" Bursar ready — bursar@stpeters.mw / Bursar@2025");

  // ============ FEE STRUCTURES ============
  // Fee breakdown per class: total = tuition + exam + building + book + uniform
  const feeData = [
    {
      classId: classes[0].id, // Form 1
      total: 2500000,
      tuition: 2000000,
      exam: 100000,
      building: 200000,
      book: 150000,
      uniform: 50000,
    },
    {
      classId: classes[1].id, // Form 2
      total: 2200000,
      tuition: 1800000,
      exam: 100000,
      building: 150000,
      book: 100000,
      uniform: 50000,
    },
    {
      classId: classes[2].id, // Form 3
      total: 2800000,
      tuition: 2200000,
      exam: 150000,
      building: 200000,
      book: 150000,
      uniform: 100000,
    },
    {
      classId: classes[3].id, // Form 4
      total: 450000,
      tuition: 350000,
      exam: 50000,
      building: 30000,
      book: 20000,
      uniform: 0,
    },
  ];

  for (const f of feeData) {
    await prisma.feeStructure.upsert({
      where: {
        schoolId_classId_academicYear_term: {
          schoolId: school.id,
          classId: f.classId,
          academicYear: "2026-2027",
          term: "TERM_1",
        },
      },
      update: {
        totalAmount: f.total,
        tuitionFee: f.tuition,
        examFee: f.exam,
        buildingLevy: f.building,
        bookFee: f.book,
        uniformFee: f.uniform,
        isActive: true,
      },
      create: {
        schoolId: school.id,
        classId: f.classId,
        academicYear: "2026-2027",
        term: "TERM_1",
        totalAmount: f.total,
        tuitionFee: f.tuition,
        examFee: f.exam,
        buildingLevy: f.building,
        bookFee: f.book,
        uniformFee: f.uniform,
      },
    });
  }
  console.log(" Fee structures ready — Form 1–4 • Term 1 • 2026-2027");

  // ============ STUDENTS ============
  const student1 = await prisma.student.upsert({
    where: { studentCode: "STP-2026-001" },
    update: { academicYear: "2026-2027" },
    create: {
      schoolId: school.id,
      classId: classes[2].id, // Form 3
      studentCode: "STP-2026-001",
      firstName: "John",
      middleName: null,
      lastName: "Banda",
      fullName: "John Banda",
      dateOfBirth: new Date("2010-03-15"),
      gender: "MALE",
      parentName: "Mary Banda",
      parentPhone: "+265995049331",
      academicYear: "2026-2027",
    },
  });

  const student2 = await prisma.student.upsert({
    where: { studentCode: "STP-2026-002" },
    update: { academicYear: "2026-2027" },
    create: {
      schoolId: school.id,
      classId: classes[3].id, // Form 4
      studentCode: "STP-2026-002",
      firstName: "Grace",
      middleName: "Mary",
      lastName: "Phiri",
      fullName: "Grace Mary Phiri",
      dateOfBirth: new Date("2009-07-22"),
      gender: "FEMALE",
      parentName: "James Phiri",
      parentPhone: "+265882781930",
      academicYear: "2026-2027",
    },
  });

  const student3 = await prisma.student.upsert({
    where: { studentCode: "STP-2026-003" },
    update: { academicYear: "2026-2027" },
    create: {
      schoolId: school.id,
      classId: classes[0].id, // Form 1
      studentCode: "STP-2026-003",
      firstName: "Roosevelt",
      middleName: null,
      lastName: "Chisomo",
      fullName: "Roosevelt Chisomo",
      dateOfBirth: new Date("2010-03-10"),
      gender: "MALE",
      parentName: "Mr Chingwalu",
      parentPhone: "+265882781930",
      parentPhone2: "+265995049331",
      parentEmail: "kulinjipatricks@gmail.com",
      academicYear: "2026-2027",
    },
  });
  console.log(
    " Students ready — John (Form 3), Grace (Form 4), Roosevelt (Form 1)",
  );

  // ============ TERM ACTIVATION HISTORY ============
  await prisma.termActivation.upsert({
    where: {
      schoolId_term_academicYear: {
        schoolId: school.id,
        term: "TERM_1",
        academicYear: "2026-2027",
      },
    },
    update: {
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-12-15"),
      activatedById: admin.id,
    },
    create: {
      schoolId: school.id,
      term: "TERM_1",
      academicYear: "2026-2027",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-12-15"),
      activatedById: admin.id,
    },
  });
  console.log(" Term activation recorded");

  // ============ TEST PAYMENTS ============
  // Story: Roosevelt paid full term fee (2.5M) and overpaid by 3.5M
  //        Grace paid a partial 100k against 450k
  //        John hasn't paid (Form 3, 2.8M owing)
  const payments = [
    {
      receiptNumber: "RCP-2026-2027-00001",
      studentId: student3.id,
      amount: 5000000,
      method: "AIRTEL_MONEY",
      notes: "Term 1 fee payment",
      required: 2500000,
    },
    {
      receiptNumber: "RCP-2026-2027-00002",
      studentId: student3.id,
      amount: 500000,
      method: "AIRTEL_MONEY",
      notes: "Second instalment",
      required: 2500000,
    },
    {
      receiptNumber: "RCP-2026-2027-00003",
      studentId: student3.id,
      amount: 400000,
      method: "CASH",
      notes: "Third instalment",
      required: 2500000,
    },
    {
      receiptNumber: "RCP-2026-2027-00004",
      studentId: student3.id,
      amount: 100000,
      method: "CASH",
      notes: "Fourth instalment",
      required: 2500000,
    },
    {
      receiptNumber: "RCP-2026-2027-00005",
      studentId: student2.id,
      amount: 100000,
      method: "CASH",
      notes: "Term 1 partial payment",
      required: 450000,
    },
  ];

  for (const p of payments) {
    await prisma.feePayment.upsert({
      where: { receiptNumber: p.receiptNumber },
      update: {
        amount: p.amount,
        term: "TERM_1",
        academicYear: "2026-2027",
        requiredAmount: p.required,
        status: "VERIFIED",
      },
      create: {
        schoolId: school.id,
        studentId: p.studentId,
        amount: p.amount,
        paymentMethod: p.method,
        term: "TERM_1",
        academicYear: "2026-2027",
        receiptNumber: p.receiptNumber,
        submittedBy: "BURSAR",
        status: "VERIFIED",
        notes: p.notes,
        recordedById: bursar.id,
        verifiedById: bursar.id,
        verifiedAt: new Date(),
        requiredAmount: p.required,
      },
    });
  }
  console.log(" Test payments recorded (5 verified)");

  // ============ CREDIT BALANCE ============
  // Roosevelt: 6,000,000 paid − 2,500,000 required = 3,500,000 credit
  await prisma.student.update({
    where: { id: student3.id },
    data: { creditBalance: 3500000 },
  });

  console.log(`
  ================================
   Seed complete!

  School: St Peters Private School
  Active term: TERM 1 • 2026-2027
  Term dates: 01 Sep 2026 — 15 Dec 2026

  Staff logins:
   - Admin   admin@stpeters.mw   / Admin@2025
   - Bursar  bursar@stpeters.mw  / Bursar@2025

  Students:
   - John Banda        Form 3  STP-2026-001  Paid MWK 0       (owing 2.8M)
   - Grace Mary Phiri  Form 4  STP-2026-002  Paid MWK 100,000 (owing 350,000)
   - Roosevelt Chisomo Form 1  STP-2026-003  Paid MWK 6,000,000
                                              → 3.5M credit for next term

  Fee structures: Form 1–4 • Term 1 • 2026-2027
  Term history: 1 record (Term 1)
  ================================
  `);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
