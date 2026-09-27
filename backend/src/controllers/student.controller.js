const prisma = require("../config/db");
const {
  generateStudentCode,
  regenerateStudentCode,
  generateReceiptNumber,
} = require("../lib/utils");

const XLSX = require("xlsx");

// Normalize a phone number to +265XXXXXXXXX
const normalizePhone = (raw) => {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("265")) return `+${digits}`;
  if (digits.length === 10 && digits.startsWith("0"))
    return `+265${digits.slice(1)}`;
  if (digits.length === 9) return `+265${digits}`;
  return null;
};

// Validate a single row. Returns { rowNumber, valid, errors, data }
const validateImportRow = (row, rowNumber, classes, fallbackYear) => {
  const errors = [];

  const firstName = String(row["First Name"] || "").trim();
  const middleName = String(row["Middle Name"] || "").trim();
  const lastName = String(row["Last Name"] || "").trim();
  const dobRaw = String(row["Date of Birth"] || "").trim();
  const gender = String(row["Gender"] || "")
    .trim()
    .toUpperCase();
  const className = String(row["Class"] || "").trim();
  const parentName = String(row["Parent Name"] || "").trim();
  const phoneRaw = String(row["Parent Phone"] || "").trim();
  const phone2Raw = String(row["Parent Phone 2"] || "").trim();
  const parentEmail = String(row["Parent Email"] || "").trim();
  const rowYear = String(row["Academic Year"] || "").trim() || fallbackYear;

  if (!firstName) errors.push("Missing first name");
  if (!lastName) errors.push("Missing last name");
  if (!dobRaw) errors.push("Missing date of birth");
  if (!gender) errors.push("Missing gender");
  if (!className) errors.push("Missing class");
  if (!parentName) errors.push("Missing parent name");
  if (!phoneRaw) errors.push("Missing parent phone");

  // DOB
  let dob = null;
  if (dobRaw) {
    dob = new Date(dobRaw);
    if (isNaN(dob.getTime())) errors.push(`Invalid date of birth: "${dobRaw}"`);
    else if (dob > new Date()) errors.push("Date of birth is in the future");
  }

  // Gender
  if (gender && !["MALE", "FEMALE"].includes(gender)) {
    errors.push(`Gender must be MALE or FEMALE (got "${gender}")`);
  }

  // Class
  let classMatch = null;
  if (className) {
    classMatch = classes.find(
      (c) => c.name.toLowerCase() === className.toLowerCase(),
    );
    if (!classMatch) errors.push(`Class "${className}" not found`);
  }

  // Phones
  const parentPhone = phoneRaw ? normalizePhone(phoneRaw) : null;
  if (phoneRaw && !parentPhone)
    errors.push(`Invalid parent phone: "${phoneRaw}"`);

  let parentPhone2 = null;
  if (phone2Raw) {
    parentPhone2 = normalizePhone(phone2Raw);
    if (!parentPhone2) errors.push(`Invalid second phone: "${phone2Raw}"`);
  }

  return {
    rowNumber,
    valid: errors.length === 0,
    errors,
    data: {
      firstName,
      middleName: middleName || null,
      lastName,
      dateOfBirth: dob ? dob.toISOString().slice(0, 10) : null,
      gender: gender || null,
      classId: classMatch?.id || null,
      className,
      parentName,
      parentPhone,
      parentPhone2,
      parentEmail: parentEmail || null,
      academicYear: rowYear,
    },
  };
};

// Parse the uploaded workbook + validate every row
const parseAndValidate = async (buffer, schoolId) => {
  const classes = await prisma.class.findMany({
    where: { schoolId, isActive: true },
  });
  if (classes.length === 0) {
    throw new Error(
      "No classes exist yet. Create classes before importing students.",
    );
  }

  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  const fallbackYear =
    school?.activeAcademicYear || new Date().getFullYear().toString();

  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

  if (rows.length === 0) throw new Error("Sheet is empty");

  // Skip fully-empty rows silently (bursars often leave a blank row at the bottom)
  const results = [];
  rows.forEach((row, i) => {
    const isEmpty = Object.values(row).every(
      (v) => v === null || v === undefined || String(v).trim() === "",
    );
    if (isEmpty) return;
    results.push(validateImportRow(row, i + 2, classes, fallbackYear));
  });

  // Duplicate within the file
  const seen = new Map();
  for (const r of results) {
    if (!r.valid) continue;
    const key =
      `${r.data.parentPhone}|${r.data.firstName}|${r.data.lastName}`.toLowerCase();
    if (seen.has(key)) {
      r.valid = false;
      r.errors.push(`Duplicate of row ${seen.get(key)} in this file`);
    } else {
      seen.set(key, r.rowNumber);
    }
  }

  // Already in DB
  for (const r of results) {
    if (!r.valid) continue;
    const fullName = [r.data.firstName, r.data.middleName, r.data.lastName]
      .filter(Boolean)
      .join(" ");
    const existing = await prisma.student.findFirst({
      where: {
        schoolId,
        parentPhone: r.data.parentPhone,
        fullName: { equals: fullName, mode: "insensitive" },
      },
    });
    if (existing) {
      r.valid = false;
      r.errors.push(`Already in system as ${existing.studentCode}`);
    }
  }

  return { classes, school, fallbackYear, results };
};

// Merge name parts into a single display name. Returns "" if no firstName/lastName.
const buildFullName = (firstName, middleName, lastName) =>
  [firstName, middleName, lastName]
    .filter((p) => p && String(p).trim())
    .map((p) => String(p).trim())
    .join(" ");

// POST /api/students
const addStudent = async (req, res) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      // fallback: allow old clients still sending fullName
      fullName: incomingFullName,
      dateOfBirth,
      gender,
      classId,
      parentName,
      parentPhone,
      parentPhone2,
      parentEmail,
      academicYear,
    } = req.body;

    // Backwards-compat: if only fullName was sent, split it
    let fName = firstName;
    let mName = middleName;
    let lName = lastName;

    if (!fName && !lName && incomingFullName) {
      const parts = String(incomingFullName).trim().split(/\s+/);
      fName = parts[0];
      lName = parts.length > 1 ? parts[parts.length - 1] : parts[0];
      mName = parts.length > 2 ? parts.slice(1, -1).join(" ") : null;
    }

    // Validate required fields
    if (
      !fName ||
      !lName ||
      !dateOfBirth ||
      !gender ||
      !classId ||
      !parentName ||
      !parentPhone
    ) {
      return res.status(400).json({
        success: false,
        message:
          "firstName, lastName, dateOfBirth, gender, classId, parentName and parentPhone are required",
      });
    }

    const mergedFullName = buildFullName(fName, mName, lName);

    // Check class belongs to this school
    const classExists = await prisma.class.findFirst({
      where: { id: classId, schoolId: req.schoolId },
    });

    if (!classExists) {
      return res.status(404).json({
        success: false,
        message: "Class not found in your school",
      });
    }

    // Duplicate check (name + parent phone)
    const existingStudent = await prisma.student.findFirst({
      where: {
        schoolId: req.schoolId,
        parentPhone,
        fullName: { equals: mergedFullName, mode: "insensitive" },
      },
    });

    if (existingStudent) {
      return res.status(409).json({
        success: false,
        message: "A student with this name and parent phone already exists",
      });
    }

    // Generate unique student code — format: PREFIX-CLASS-YEAR-SEQ
    const year = academicYear || new Date().getFullYear().toString();
    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
    });

    // Count only students in THIS class — each class has its own sequence
    const classCount = await prisma.student.count({
      where: { schoolId: req.schoolId, classId },
    });

    const studentCode = generateStudentCode(
      school.name,
      classExists.name,
      classExists.level,
      year,
      classCount + 1,
    );

    // Create student
    const student = await prisma.student.create({
      data: {
        schoolId: req.schoolId,
        classId,
        studentCode,
        firstName: fName.trim(),
        middleName: mName?.trim() || null,
        lastName: lName.trim(),
        fullName: mergedFullName,
        dateOfBirth: new Date(dateOfBirth),
        gender,
        parentName: parentName.trim(),
        parentPhone: parentPhone.trim(),
        parentPhone2: parentPhone2?.trim() || null,
        parentEmail: parentEmail?.trim() || null,
        academicYear: year,
      },
      include: {
        class: { select: { id: true, name: true } },
        school: { select: { id: true, name: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        schoolId: req.schoolId,
        staffId: req.staff.id,
        action: "STUDENT_ADDED",
        entity: "Student",
        entityId: student.id,
        changes: {
          studentCode,
          firstName: fName,
          middleName: mName || null,
          lastName: lName,
          fullName: mergedFullName,
          classId,
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: `Student ${student.fullName} added successfully`,
      data: student,
    });
  } catch (error) {
    console.error("Add student error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add student",
    });
  }
};

// ==================== GET ALL STUDENTS ====================
// GET /api/students
const getStudents = async (req, res) => {
  try {
    const {
      search,
      classId,
      academicYear,
      isActive,
      isDebtor,
      isPaidFull,
      noPayment,
      hasCredit,
      page = 1,
      limit = 20,
    } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { schoolId: req.schoolId };
    if (classId) where.classId = classId;
    if (academicYear) where.academicYear = academicYear;
    if (isActive !== undefined) where.isActive = isActive === "true";

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { studentCode: { contains: search, mode: "insensitive" } },
        { parentName: { contains: search, mode: "insensitive" } },
        { parentPhone: { contains: search } },
      ];
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        include: {
          class: { select: { id: true, name: true } },
          payments: {
            where: { status: "VERIFIED" },
            select: {
              amount: true,
              term: true,
              academicYear: true,
              isDebtor: true,
              balance: true,
              requiredAmount: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { fullName: "asc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.student.count({ where }),
    ]);

    const studentsWithSummary = students.map((student) => {
      const verifiedPayments = student.payments;
      const totalPaid = verifiedPayments.reduce((sum, p) => sum + p.amount, 0);

      // Student is debtor if their latest payment for any term shows isDebtor=true
      const isDebtorStudent = verifiedPayments.some((p) => p.isDebtor);

      // Total outstanding balance across all terms
      const totalBalance = verifiedPayments
        .filter((p) => p.isDebtor && p.balance)
        .reduce((sum, p) => sum + (p.balance || 0), 0);

      return {
        ...student,
        totalPaid,
        isDebtor: isDebtorStudent,
        outstandingBalance: totalBalance,
        creditBalance: student.creditBalance || 0,
        payments: undefined,
      };
    });

    // If filtering by debtor status
    // Apply status filters in memory after fetching
    let filteredStudents = studentsWithSummary;

    if (isDebtor === "true") {
      // Students with balances
      filteredStudents = studentsWithSummary.filter((s) => s.isDebtor);
    } else if (isPaidFull === "true") {
      // Students who finished paying
      filteredStudents = studentsWithSummary.filter(
        (s) => !s.isDebtor && s.totalPaid > 0 && s.outstandingBalance === 0,
      );
    } else if (noPayment === "true") {
      // Students who never paid anything
      filteredStudents = studentsWithSummary.filter((s) => s.totalPaid === 0);
    } else if (hasCredit === "true") {
      // Students with extra money/credit
      filteredStudents = studentsWithSummary.filter(
        (s) => (s.creditBalance || 0) > 0,
      );
    }

    return res.status(200).json({
      success: true,
      data: filteredStudents,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get students error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to get students" });
  }
};

// ==================== GET SINGLE STUDENT ====================
// GET /api/students/:id
const getStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await prisma.student.findFirst({
      where: { id, schoolId: req.schoolId },
      include: {
        class: { select: { id: true, name: true } },
        school: { select: { id: true, name: true } },
        payments: {
          orderBy: { createdAt: "desc" },
          include: {
            recordedBy: { select: { fullName: true, role: true } },
            verifiedBy: { select: { fullName: true } },
          },
        },
      },
    });

    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    const verifiedPayments = student.payments.filter(
      (p) => p.status === "VERIFIED",
    );
    const totalPaid = verifiedPayments.reduce((sum, p) => sum + p.amount, 0);
    const pendingPayments = student.payments.filter(
      (p) => p.status === "PENDING",
    );
    const isDebtor = verifiedPayments.some((p) => p.isDebtor);
    const outstandingBalance = verifiedPayments
      .filter((p) => p.isDebtor && p.balance)
      .reduce((sum, p) => sum + (p.balance || 0), 0);

    // Get fee structures for this student's class
    const feeStructures = await prisma.feeStructure.findMany({
      where: {
        schoolId: req.schoolId,
        classId: student.classId,
        isActive: true,
      },
      orderBy: { term: "asc" },
    });

    return res.status(200).json({
      success: true,
      data: {
        ...student,
        summary: {
          totalPaid,
          pendingCount: pendingPayments.length,
          verifiedCount: verifiedPayments.length,
          isDebtor,
          outstandingBalance,
        },
        feeStructures,
      },
    });
  } catch (error) {
    console.error("Get student error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to get student" });
  }
};

// ==================== UPDATE STUDENT ====================
// PUT /api/students/:id
// ==================== UPDATE STUDENT ====================
// PUT /api/students/:id
const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      middleName,
      lastName,
      fullName: incomingFullName,
      classId,
      parentName,
      parentPhone,
      parentPhone2,
      parentEmail,
      isActive,
    } = req.body;

    const existing = await prisma.student.findFirst({
      where: { id, schoolId: req.schoolId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Resolve name parts. Prefer explicit parts; fall back to splitting fullName.
    let fName = firstName ?? existing.firstName;
    let mName = middleName ?? existing.middleName;
    let lName = lastName ?? existing.lastName;

    if (
      !firstName &&
      !middleName &&
      !lastName &&
      incomingFullName &&
      incomingFullName !== existing.fullName
    ) {
      const parts = String(incomingFullName).trim().split(/\s+/);
      fName = parts[0];
      lName = parts.length > 1 ? parts[parts.length - 1] : parts[0];
      mName = parts.length > 2 ? parts.slice(1, -1).join(" ") : null;
    }

    const mergedFullName = buildFullName(fName, mName, lName);

    const updated = await prisma.student.update({
      where: { id },
      data: {
        firstName: fName.trim(),
        middleName: mName?.trim() || null,
        lastName: lName.trim(),
        fullName: mergedFullName,
        ...(classId && { classId }),
        ...(parentName && { parentName: parentName.trim() }),
        ...(parentPhone && { parentPhone: parentPhone.trim() }),
        ...(parentPhone2 !== undefined && {
          parentPhone2: parentPhone2?.trim() || null,
        }),
        ...(parentEmail !== undefined && {
          parentEmail: parentEmail?.trim() || null,
        }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        class: { select: { id: true, name: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        schoolId: req.schoolId,
        staffId: req.staff.id,
        action: "STUDENT_UPDATED",
        entity: "Student",
        entityId: id,
        changes: req.body,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Student updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Update student error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update student",
    });
  }
};

// ==================== SEARCH STUDENTS (for bursar quick search) ====================
// GET /api/students/search?q=john
const searchStudents = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters",
      });
    }

    const students = await prisma.student.findMany({
      where: {
        schoolId: req.schoolId,
        isActive: true,
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { firstName: { contains: q, mode: "insensitive" } },
          { middleName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { studentCode: { contains: q, mode: "insensitive" } },
          { parentPhone: { contains: q } },
          { parentName: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        studentCode: true,
        fullName: true,
        parentName: true,
        parentPhone: true,
        classId: true,
        creditBalance: true,
        class: { select: { name: true } },
        payments: {
          where: { status: "VERIFIED" },
          select: { amount: true },
        },
      },
      take: 10,
    });

    const results = students.map((s) => ({
      id: s.id,
      studentCode: s.studentCode,
      fullName: s.fullName,
      className: s.class.name,
      classId: s.classId,
      parentName: s.parentName,
      parentPhone: s.parentPhone,
      creditBalance: s.creditBalance || 0,
      totalPaid: s.payments.reduce((sum, p) => sum + p.amount, 0),
    }));

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Search students error:", error);
    return res.status(500).json({
      success: false,
      message: "Search failed",
    });
  }
};

// ==================== GET STUDENT BY CODE (for parent login) ====================
// GET /api/students/by-code/:code
const getStudentByCode = async (req, res) => {
  try {
    const { code } = req.params;

    const student = await prisma.student.findUnique({
      where: { studentCode: code.toUpperCase() },
      select: {
        id: true,
        studentCode: true,
        firstName: true,
        middleName: true,
        lastName: true,
        fullName: true,
        dateOfBirth: true,
        school: { select: { name: true } },
        class: { select: { name: true } },
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Don't expose date of birth - just confirm student exists
    return res.status(200).json({
      success: true,
      data: {
        id: student.id,
        studentCode: student.studentCode,
        firstName: student.firstName,
        middleName: student.middleName,
        lastName: student.lastName,
        fullName: student.fullName,
        school: student.school.name,
        class: student.class.name,
      },
    });
  } catch (error) {
    console.error("Get student by code error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to find student",
    });
  }
};

// ==================== BULK IMPORT HELPERS ====================

// ==================== PREVIEW ====================
// POST /api/students/bulk/preview  (multipart: file)
const bulkImportPreview = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    const { results } = await parseAndValidate(req.file.buffer, req.schoolId);
    const validCount = results.filter((r) => r.valid).length;

    return res.json({
      success: true,
      data: {
        totalRows: results.length,
        validCount,
        errorCount: results.length - validCount,
        rows: results,
      },
    });
  } catch (err) {
    console.error("Bulk preview error:", err);
    return res.status(400).json({
      success: false,
      message: err.message || "Failed to read file",
    });
  }
};

// ==================== IMPORT ====================
// POST /api/students/bulk/import  (multipart: file)
const bulkImport = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    const { classes, school, results } = await parseAndValidate(
      req.file.buffer,
      req.schoolId,
    );

    const invalidRows = results.filter((r) => !r.valid);
    if (invalidRows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `${invalidRows.length} row(s) have errors. Fix the sheet and try again.`,
        data: {
          totalRows: results.length,
          validCount: results.length - invalidRows.length,
          errorCount: invalidRows.length,
          rows: results,
        },
      });
    }

    const created = [];
    const failed = [];

    const classCounts = {};
    for (const cls of classes) {
      classCounts[cls.id] = await prisma.student.count({
        where: { schoolId: req.schoolId, classId: cls.id },
      });
    }

    for (const r of results) {
      try {
        const d = r.data;
        const classObj = classes.find((c) => c.id === d.classId);
        classCounts[d.classId] = (classCounts[d.classId] || 0) + 1;
        const seq = classCounts[d.classId];

        const studentCode = generateStudentCode(
          school.name,
          classObj.name,
          classObj.level,
          d.academicYear,
          seq,
        );

        const fullName = [d.firstName, d.middleName, d.lastName]
          .filter(Boolean)
          .join(" ");

        const student = await prisma.student.create({
          data: {
            schoolId: req.schoolId,
            classId: d.classId,
            studentCode,
            firstName: d.firstName,
            middleName: d.middleName,
            lastName: d.lastName,
            fullName,
            dateOfBirth: new Date(d.dateOfBirth),
            gender: d.gender,
            parentName: d.parentName,
            parentPhone: d.parentPhone,
            parentPhone2: d.parentPhone2,
            parentEmail: d.parentEmail,
            academicYear: d.academicYear,
          },
        });

        created.push({
          row: r.rowNumber,
          studentCode: student.studentCode,
          fullName: student.fullName,
          className: classObj.name,
        });
      } catch (err) {
        failed.push({ row: r.rowNumber, error: err.message });
      }
    }

    await prisma.auditLog.create({
      data: {
        schoolId: req.schoolId,
        staffId: req.staff.id,
        action: "STUDENTS_BULK_IMPORTED",
        entity: "Student",
        changes: { imported: created.length, failed: failed.length },
      },
    });

    return res.status(201).json({
      success: true,
      message: `Imported ${created.length} student(s)${failed.length ? `, ${failed.length} failed` : ""}`,
      data: { created, failed },
    });
  } catch (err) {
    console.error("Bulk import error:", err);
    return res.status(400).json({
      success: false,
      message: err.message || "Failed to import students",
    });
  }
};

module.exports = {
  addStudent,
  getStudents,
  getStudent,
  updateStudent,
  searchStudents,
  getStudentByCode,
  bulkImportPreview,
  bulkImport,
};
