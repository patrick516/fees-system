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
  const cleanName = String(className)
    .trim()
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();
  const firstLetter = cleanName.charAt(0);

  //  Try to extract the number directly from the name (e.g., "FORM1" -> 1)
  const nameMatch = cleanName.match(/\d+/);

  // If the name has a number, use it. If not (e.g., "Kindergarten"), fall back to the level.
  const finalLevel = nameMatch ? nameMatch[0] : level;

  return `${firstLetter}${finalLevel}`;
};

const buildYearTag = (academicYear) => {
  return String(academicYear).split("-")[0];
};

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

const regenerateStudentCode = (schoolName, className, level, oldCode) => {
  const prefix = buildSchoolPrefix(schoolName);
  const classTag = buildClassTag(className, level);
  const parts = String(oldCode).split("-");
  const yearTag = parts.length >= 2 ? parts[parts.length - 2] : "2026";
  const seq = parts.length >= 1 ? parts[parts.length - 1] : "001";
  return `${prefix}-${classTag}-${yearTag}-${seq}`;
};

//  RECEIPT NUMBER

// Format: RCP-{PREFIX}-{YEAR}-{SEQ}
const generateReceiptNumber = (schoolPrefix, year, sequence) => {
  const cleanPrefix = String(schoolPrefix || "SCH")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 4);
  const paddedSeq = String(sequence).padStart(5, "0");
  return `RCP-${cleanPrefix}-${year}-${paddedSeq}`;
};

module.exports = {
  generateStudentCode,
  regenerateStudentCode,
  generateReceiptNumber,
  buildSchoolPrefix,
};
