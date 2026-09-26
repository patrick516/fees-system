// ==================== STUDENT CODE ====================
// Format: {PREFIX}-{CLASS_TAG}-{YEAR}-{SEQ}
//   PREFIX    = first letter of up to first 3 words of school name
//   CLASS_TAG = first letter of class name + level (Form 1 -> F1, Grade 5 -> G5)
//   YEAR      = first part of academicYear (2026-2027 -> 2026)
//   SEQ       = 3-digit sequence, unique per school
//
// Examples:
//   St Peters Private School, Form 1, 2026-2027, seq 1 -> SPP-F1-2026-001
//   St Peters Private School, Form 2, 2026-2027, seq 42 -> SPP-F2-2026-042
const buildSchoolPrefix = (schoolName) => {
  return schoolName
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);
};

const buildClassTag = (className, level) => {
  const firstLetter = className.trim().charAt(0).toUpperCase();
  return `${firstLetter}${level}`;
};

const buildYearTag = (academicYear) => {
  // academicYear is "2026-2027", we want "2026"
  return String(academicYear).split("-")[0];
};

/**
 * Generate a student code, e.g. SPP-F1-2026-001
 */
const generateStudentCode = (
  schoolName,
  className,
  level,
  academicYear,
  sequence,
) => {
  const prefix = buildSchoolPrefix(schoolName);
  const classTag = buildClassTag(className, level);
  const yearTag = buildYearTag(academicYear);
  const paddedSeq = String(sequence).padStart(3, "0");
  return `${prefix}-${classTag}-${yearTag}-${paddedSeq}`;
};

/**
 * Regenerate a student code with a new class tag, preserving year + sequence
 * from the original code.
 * e.g. SPP-F1-2026-007 -> SPP-F2-2026-007
 */
const regenerateStudentCode = (schoolName, className, level, oldCode) => {
  const prefix = buildSchoolPrefix(schoolName);
  const classTag = buildClassTag(className, level);
  const parts = String(oldCode).split("-");
  // Old format: PREFIX-CLASS-YEAR-SEQ (or legacy: PREFIX-YEAR-SEQ)
  // We grab the last two segments = year + seq
  const yearTag = parts.length >= 2 ? parts[parts.length - 2] : "2026";
  const seq = parts.length >= 1 ? parts[parts.length - 1] : "001";
  return `${prefix}-${classTag}-${yearTag}-${seq}`;
};

// ==================== RECEIPT NUMBER ====================
// Format: RCP-{YEAR}-{SEQ}
const generateReceiptNumber = (year, sequence) => {
  const paddedSeq = String(sequence).padStart(5, "0");
  return `RCP-${year}-${paddedSeq}`;
};

module.exports = {
  generateStudentCode,
  regenerateStudentCode,
  generateReceiptNumber,
};
