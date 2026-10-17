// backend/src/controllers/platformOnekhusa.controller.js
const prisma = require("../config/db");
const onekhusa = require("../lib/onekhusa");

const listOneKhusaMerchants = async (req, res) => {
  try {
    // 1. Get a valid merchant account from the platform to generate the token
    const platform = await prisma.platform.findFirst({
      select: { subscriptionMerchantAccount: true },
    });

    if (!platform?.subscriptionMerchantAccount) {
      return res.status(400).json({
        success: false,
        message:
          "Platform subscription merchant account is not configured yet.",
      });
    }

    // 2. Fetch merchants from OneKhusa
    const result = await onekhusa.getAllMerchants(
      platform.subscriptionMerchantAccount,
    );

    // OneKhusa usually returns an array or an object containing an array
    const merchantsList = Array.isArray(result)
      ? result
      : result.data || result.items || [];

    // 3. Fetch all schools from your database
    const schools = await prisma.school.findMany({
      select: {
        id: true,
        name: true,
        onekhusaMerchantAccount: true,
      },
    });

    // 4. Cross-reference merchants with schools
    const enrichedMerchants = merchantsList.map((m) => {
      // Find if this OneKhusa merchant is linked to a school in our system
      const linkedSchool = schools.find(
        (s) =>
          String(s.onekhusaMerchantAccount) === String(m.merchantAccountNumber),
      );

      return {
        accountNumber: m.merchantAccountNumber,
        accountName: m.accountName,
        status: m.statusName || m.status || "Unknown",
        balance: m.accountBalance || 0,
        currency: m.currencyCode || "MWK",
        dateCreated: m.dateCreated,
        linkedSchool: linkedSchool
          ? { id: linkedSchool.id, name: linkedSchool.name }
          : null,
      };
    });

    // Sort by status (Active first)
    enrichedMerchants.sort((a, b) => (a.status === "Active" ? -1 : 1));

    return res.json({ success: true, data: enrichedMerchants });
  } catch (err) {
    console.error("listOneKhusaMerchants error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch merchants from OneKhusa",
      error: err.response?.data?.detail || err.message,
    });
  }
};

module.exports = { listOneKhusaMerchants };
