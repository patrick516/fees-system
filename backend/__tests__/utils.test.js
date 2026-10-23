const {
  generateReceiptNumber,
  buildSchoolPrefix,
} = require("../src/lib/utils");

describe("Utils", () => {
  test("generates unique receipt numbers with school prefix", () => {
    expect(generateReceiptNumber("CHI", "2026", 1)).toBe("RCP-CHI-2026-00001");
  });

  test("builds school prefix correctly", () => {
    expect(buildSchoolPrefix("Chichiri Secondary School")).toBe("CSS");
  });
});
