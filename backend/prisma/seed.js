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
  console.log(" School ready");

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
  console.log(" Classes ready (Form 1–4)");

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
  // 20 students across 4 classes. Codes: SPP-F{level}-2026-{001..020}
  // Special case: Mr Chingwalu (+265882781930) is guardian for TWO students
  // (Roosevelt Chisomo in Form 1, Thokozani Phiri in Form 3).
  const studentsData = [
    // ===== Form 1 (LETTER) =====
    {
      code: "SPP-F1-2026-001",
      classId: classes[0].id,
      firstName: "Roosevelt",
      middleName: null,
      lastName: "Chisomo",
      gender: "MALE",
      dob: "2010-03-10",
      parentName: "Mr Chingwalu",
      parentPhone: "+265998333060",
      parentPhone2: "+265995049331",
      parentEmail: "kulinjipatricks@gmail.com",
    },
    {
      code: "SPP-F1-2026-002",
      classId: classes[0].id,
      firstName: "Emmanuel",
      middleName: null,
      lastName: "Kachale",
      gender: "MALE",
      dob: "2010-06-11",
      parentName: "Grace Kachale",
      parentPhone: "+265991112301",
    },
    {
      code: "SPP-F1-2026-003",
      classId: classes[0].id,
      firstName: "Grace",
      middleName: null,
      lastName: "Chunga",
      gender: "FEMALE",
      dob: "2010-08-22",
      parentName: "Moses Chunga",
      parentPhone: "+265991112302",
    },
    {
      code: "SPP-F1-2026-004",
      classId: classes[0].id,
      firstName: "Dalitso",
      middleName: null,
      lastName: "Nkhoma",
      gender: "MALE",
      dob: "2010-01-15",
      parentName: "Esther Nkhoma",
      parentPhone: "+265991112303",
    },
    {
      code: "SPP-F1-2026-005",
      classId: classes[0].id,
      firstName: "Faith",
      middleName: null,
      lastName: "Msukwa",
      gender: "FEMALE",
      dob: "2010-04-29",
      parentName: "Hastings Msukwa",
      parentPhone: "+265991112304",
    },

    // ===== Form 2 (LETTER) =====
    {
      code: "SPP-F2-2026-006",
      classId: classes[1].id,
      firstName: "Chisomo",
      middleName: null,
      lastName: "Mvula",
      gender: "FEMALE",
      dob: "2010-05-08",
      parentName: "Mr Mvula",
      parentPhone: "+265899110469",
    },
    {
      code: "SPP-F2-2026-007",
      classId: classes[1].id,
      firstName: "Innocent",
      middleName: "K",
      lastName: "Chimwendo",
      gender: "MALE",
      dob: "2009-12-05",
      parentName: "Violet Chimwendo",
      parentPhone: "+265991112305",
    },
    {
      code: "SPP-F2-2026-008",
      classId: classes[1].id,
      firstName: "Ruth",
      middleName: null,
      lastName: "Kalua",
      gender: "FEMALE",
      dob: "2010-09-09",
      parentName: "Robert Kalua",
      parentPhone: "+265991112306",
    },
    {
      code: "SPP-F2-2026-009",
      classId: classes[1].id,
      firstName: "Patrick",
      middleName: null,
      lastName: "Nyasulu",
      gender: "MALE",
      dob: "2010-02-27",
      parentName: "Linda Nyasulu",
      parentPhone: "+265991112307",
    },
    {
      code: "SPP-F2-2026-010",
      classId: classes[1].id,
      firstName: "Memory",
      middleName: "T",
      lastName: "Chizuma",
      gender: "FEMALE",
      dob: "2010-07-03",
      parentName: "Elton Chizuma",
      parentPhone: "+265991112308",
    },

    // ===== Form 3 (POINTS) =====
    {
      code: "SPP-F3-2026-011",
      classId: classes[2].id,
      firstName: "John",
      middleName: null,
      lastName: "Banda",
      gender: "MALE",
      dob: "2009-03-15",
      parentName: "Mary Banda",
      parentPhone: "+265995049331",
    },
    {
      code: "SPP-F3-2026-012",
      classId: classes[2].id,
      firstName: "Wisdom",
      middleName: null,
      lastName: "Nkhata",
      gender: "MALE",
      dob: "2008-11-18",
      parentName: "Chrissy Nkhata",
      parentPhone: "+265991112309",
    },
    {
      code: "SPP-F3-2026-013",
      classId: classes[2].id,
      firstName: "Joyce",
      middleName: null,
      lastName: "Manda",
      gender: "FEMALE",
      dob: "2009-05-24",
      parentName: "Andrew Manda",
      parentPhone: "+265991112310",
    },
    {
      // Second child of Mr Chingwalu — shares the same parent phone as Roosevelt
      code: "SPP-F3-2026-014",
      classId: classes[2].id,
      firstName: "Thokozani",
      middleName: null,
      lastName: "Phiri",
      gender: "FEMALE",
      dob: "2009-01-12",
      parentName: "Mr Chingwalu",
      parentPhone: "+265998333060",
    },
    {
      code: "SPP-F3-2026-015",
      classId: classes[2].id,
      firstName: "Blessings",
      middleName: null,
      lastName: "Tembo",
      gender: "MALE",
      dob: "2008-08-30",
      parentName: "Memory Tembo",
      parentPhone: "+265991112311",
    },

    // ===== Form 4 (POINTS) =====
    {
      code: "SPP-F4-2026-016",
      classId: classes[3].id,
      firstName: "Grace",
      middleName: "Mary",
      lastName: "Phiri",
      gender: "FEMALE",
      dob: "2008-07-22",
      parentName: "James Phiri",
      parentPhone: "+265882781930",
    },
    {
      code: "SPP-F4-2026-017",
      classId: classes[3].id,
      firstName: "Mphatso",
      middleName: null,
      lastName: "Banda",
      gender: "FEMALE",
      dob: "2008-03-14",
      parentName: "Chimwemwe Banda",
      parentPhone: "+265991112312",
    },
    {
      code: "SPP-F4-2026-018",
      classId: classes[3].id,
      firstName: "Chimwemwe",
      middleName: null,
      lastName: "Mkandawire",
      gender: "MALE",
      dob: "2007-10-01",
      parentName: "Tamandani Mkandawire",
      parentPhone: "+265991112313",
    },
    {
      code: "SPP-F4-2026-019",
      classId: classes[3].id,
      firstName: "Tiyamike",
      middleName: null,
      lastName: "Gondwe",
      gender: "FEMALE",
      dob: "2008-05-09",
      parentName: "Madalitso Gondwe",
      parentPhone: "+265991112314",
    },
    {
      code: "SPP-F4-2026-020",
      classId: classes[3].id,
      firstName: "Yankho",
      middleName: null,
      lastName: "Chirambo",
      gender: "MALE",
      dob: "2007-12-25",
      parentName: "Steven Chirambo",
      parentPhone: "+265991112315",
    },
  ];

  const students = {};
  for (const s of studentsData) {
    const fullName = [s.firstName, s.middleName, s.lastName]
      .filter(Boolean)
      .join(" ");

    const created = await prisma.student.upsert({
      where: { studentCode: s.code },
      update: { academicYear: "2026-2027" },
      create: {
        schoolId: school.id,
        classId: s.classId,
        studentCode: s.code,
        firstName: s.firstName,
        middleName: s.middleName,
        lastName: s.lastName,
        fullName,
        dateOfBirth: new Date(s.dob),
        gender: s.gender,
        parentName: s.parentName,
        parentPhone: s.parentPhone,
        parentPhone2: s.parentPhone2 || null,
        parentEmail: s.parentEmail || null,
        academicYear: "2026-2027",
      },
    });
    students[s.code] = created;
  }
  console.log(` Students ready (${studentsData.length} across Form 1–4)`);

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
  // Payment distribution per class:
  //   Some paid in full, some partial (debtor), some nothing at all.
  // Roosevelt overpaid → 3.5M credit for next term.
  const paymentsData = [
    // ===== Form 1 (fee: 2,500,000) =====
    {
      receipt: "RCP-2026-2027-00001",
      code: "SPP-F1-2026-001",
      amount: 5000000,
      method: "AIRTEL_MONEY",
      notes: "Term 1 fee payment",
    },
    {
      receipt: "RCP-2026-2027-00002",
      code: "SPP-F1-2026-001",
      amount: 500000,
      method: "AIRTEL_MONEY",
      notes: "Second instalment",
    },
    {
      receipt: "RCP-2026-2027-00003",
      code: "SPP-F1-2026-001",
      amount: 400000,
      method: "CASH",
      notes: "Third instalment",
    },
    {
      receipt: "RCP-2026-2027-00004",
      code: "SPP-F1-2026-001",
      amount: 100000,
      method: "CASH",
      notes: "Fourth instalment",
    },
    {
      receipt: "RCP-2026-2027-00005",
      code: "SPP-F1-2026-003",
      amount: 2500000,
      method: "CASH",
      notes: "Full term payment",
    },
    {
      receipt: "RCP-2026-2027-00006",
      code: "SPP-F1-2026-004",
      amount: 1000000,
      method: "AIRTEL_MONEY",
      notes: "Partial payment",
    },
    {
      receipt: "RCP-2026-2027-00007",
      code: "SPP-F1-2026-005",
      amount: 500000,
      method: "CASH",
      notes: "Partial payment",
    },
    // Emmanuel Kachale (002) has no payment → full debtor

    // ===== Form 2 (fee: 2,200,000) =====
    {
      receipt: "RCP-2026-2027-00008",
      code: "SPP-F2-2026-007",
      amount: 800000,
      method: "AIRTEL_MONEY",
      notes: "Partial payment",
    },
    {
      receipt: "RCP-2026-2027-00009",
      code: "SPP-F2-2026-008",
      amount: 2200000,
      method: "CASH",
      notes: "Full term payment",
    },
    {
      receipt: "RCP-2026-2027-00010",
      code: "SPP-F2-2026-009",
      amount: 500000,
      method: "AIRTEL_MONEY",
      notes: "Partial payment",
    },
    {
      receipt: "RCP-2026-2027-00011",
      code: "SPP-F2-2026-010",
      amount: 1500000,
      method: "CASH",
      notes: "Partial payment",
    },
    // Chisomo Mvula (006) has no payment → full debtor

    // ===== Form 3 (fee: 2,800,000) =====
    {
      receipt: "RCP-2026-2027-00012",
      code: "SPP-F3-2026-012",
      amount: 2800000,
      method: "CASH",
      notes: "Full term payment",
    },
    {
      receipt: "RCP-2026-2027-00013",
      code: "SPP-F3-2026-013",
      amount: 2800000,
      method: "CASH",
      notes: "Full term payment",
    },
    {
      receipt: "RCP-2026-2027-00014",
      code: "SPP-F3-2026-014",
      amount: 1000000,
      method: "AIRTEL_MONEY",
      notes: "Partial payment",
    },
    {
      receipt: "RCP-2026-2027-00015",
      code: "SPP-F3-2026-015",
      amount: 500000,
      method: "CASH",
      notes: "Partial payment",
    },
    // John Banda (011) has no payment → full debtor

    // ===== Form 4 (fee: 450,000) =====
    {
      receipt: "RCP-2026-2027-00016",
      code: "SPP-F4-2026-016",
      amount: 100000,
      method: "CASH",
      notes: "Partial payment",
    },
    {
      receipt: "RCP-2026-2027-00017",
      code: "SPP-F4-2026-017",
      amount: 450000,
      method: "CASH",
      notes: "Full term payment",
    },
    {
      receipt: "RCP-2026-2027-00018",
      code: "SPP-F4-2026-018",
      amount: 200000,
      method: "AIRTEL_MONEY",
      notes: "Partial payment",
    },
    {
      receipt: "RCP-2026-2027-00019",
      code: "SPP-F4-2026-020",
      amount: 450000,
      method: "CASH",
      notes: "Full term payment",
    },
    // Tiyamike Gondwe (019) has no payment → full debtor
  ];

  // Fee per class (looked up by classId) — used for requiredAmount on each payment
  const feeByClassId = {};
  for (const f of feeData) feeByClassId[f.classId] = f.total;

  for (const p of paymentsData) {
    const student = students[p.code];
    if (!student) continue;

    const required = feeByClassId[student.classId] || 0;

    await prisma.feePayment.upsert({
      where: { receiptNumber: p.receipt },
      update: {
        amount: p.amount,
        term: "TERM_1",
        academicYear: "2026-2027",
        requiredAmount: required,
        status: "VERIFIED",
      },
      create: {
        schoolId: school.id,
        studentId: student.id,
        amount: p.amount,
        paymentMethod: p.method,
        term: "TERM_1",
        academicYear: "2026-2027",
        receiptNumber: p.receipt,
        submittedBy: "BURSAR",
        status: "VERIFIED",
        notes: p.notes,
        recordedById: bursar.id,
        verifiedById: bursar.id,
        verifiedAt: new Date(),
        requiredAmount: required,
      },
    });
  }
  console.log(` Test payments recorded (${paymentsData.length} verified)`);

  // ============ CREDIT BALANCE ============
  // Roosevelt: 6,000,000 paid − 2,500,000 required = 3,500,000 credit
  await prisma.student.update({
    where: { id: students["SPP-F1-2026-001"].id },
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

  Students: 20 (5 per class)
   Form 1 (2,500,000 each):
    - Roosevelt Chisomo     SPP-F1-2026-001  Paid 6,000,000  → 3.5M credit
    - Emmanuel Kachale      SPP-F1-2026-002  Paid 0          → owing
    - Grace Chunga          SPP-F1-2026-003  Paid 2,500,000  → paid
    - Dalitso Nkhoma        SPP-F1-2026-004  Paid 1,000,000  → owing
    - Faith Msukwa          SPP-F1-2026-005  Paid 500,000    → owing

   Form 2 (2,200,000 each):
    - Chisomo Mvula         SPP-F2-2026-006  Paid 0          → owing
    - Innocent Chimwendo    SPP-F2-2026-007  Paid 800,000    → owing
    - Ruth Kalua            SPP-F2-2026-008  Paid 2,200,000  → paid
    - Patrick Nyasulu       SPP-F2-2026-009  Paid 500,000    → owing
    - Memory Chizuma        SPP-F2-2026-010  Paid 1,500,000  → owing

   Form 3 (2,800,000 each):
    - John Banda            SPP-F3-2026-011  Paid 0          → owing
    - Wisdom Nkhata         SPP-F3-2026-012  Paid 2,800,000  → paid
    - Joyce Manda           SPP-F3-2026-013  Paid 2,800,000  → paid
    - Thokozani Phiri       SPP-F3-2026-014  Paid 1,000,000  → owing
    - Blessings Tembo       SPP-F3-2026-015  Paid 500,000    → owing

   Form 4 (450,000 each):
    - Grace Mary Phiri      SPP-F4-2026-016  Paid 100,000    → owing
    - Mphatso Banda         SPP-F4-2026-017  Paid 450,000    → paid
    - Chimwemwe Mkandawire  SPP-F4-2026-018  Paid 200,000    → owing
    - Tiyamike Gondwe       SPP-F4-2026-019  Paid 0          → owing
    - Yankho Chirambo       SPP-F4-2026-020  Paid 450,000    → paid

  Shared guardians:
   - Mr Chingwalu (+265882781930) → Roosevelt (Form 1) + Thokozani (Form 3)
   - +265995049331 (secondary) → Roosevelt (Form 1) + John (Form 3)
   - +265882781930 also on Grace Phiri (Form 4)

  Fee structures: Form 1–4 • Term 1 • 2026-2027
  Term history: 1 record (Term 1)
  ================================
  `);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
