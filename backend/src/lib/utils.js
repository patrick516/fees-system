// Generate unique student code eg STP-2025-001
const generateStudentCode = (schoolName, year, sequence) => {
  const prefix = schoolName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);

  const paddedSeq = String(sequence).padStart(3, "0");
  return `${prefix}-${year}-${paddedSeq}`;
};

// Generate receipt number
const generateReceiptNumber = (year, sequence) => {
  const paddedSeq = String(sequence).padStart(5, "0");
  return `RCP-${year}-${paddedSeq}`;
};

module.exports = {
  generateStudentCode,
  generateReceiptNumber,
};
