require("dotenv").config();
const axios = require("axios");

const BASE_URL = "https://api.onekhusa.com/sandbox/v1";
const MERCHANT = 75480583;
const EMAIL = "kulinjipatricks@gmail.com";
const TEST_BANK_SUCCESS = "3333888800";
const TEST_PHONE_SUCCESS = "111100000112";

async function getToken() {
  const res = await axios.post(`${BASE_URL}/account/getAccessToken`, {
    apiKey: process.env.ONEKHUSA_API_KEY,
    apiSecret: process.env.ONEKHUSA_API_SECRET,
    organisationId: process.env.ONEKHUSA_ORGANISATION_ID,
    merchantAccountNumber: MERCHANT,
  });
  return res.data.accessToken;
}

async function getActiveConnector(token) {
  const res = await axios.get(`${BASE_URL}/core/connectors/GetAll`, {
    headers: { Authorization: `Bearer ${token}`, "Accept-Language": "en" },
  });
  const active = res.data.find((c) => c.isActive === true);
  if (!active) throw new Error("No active connector found");
  return active.connectorId;
}

async function createDisbursements(token, connectorId, count) {
  console.log(`💸 Creating and approving ${count} disbursements...`);
  for (let i = 0; i < count; i++) {
    const ref = `PAY${Date.now().toString(36).toUpperCase()}${i}`;
    const amount = 500 + i * 50;
    const beneficiaryAccount =
      i % 2 === 0 ? TEST_BANK_SUCCESS : TEST_PHONE_SUCCESS;

    try {
      const createRes = await axios.post(
        `${BASE_URL}/disbursements/single/add`,
        {
          merchantAccountNumber: MERCHANT,
          sourceReferenceNumber: ref,
          beneficiaryName: "Test Beneficiary",
          beneficiaryAccountNumber: beneficiaryAccount,
          connectorId: connectorId,
          transactionAmount: amount,
          transactionDescription: "KYC test payout",
          capturedBy: EMAIL,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Accept-Language": "en",
            "X-Idempotency-Key": `disb-${ref}`,
          },
        },
      );

      const txRef = createRes.data.transactionReferenceNumber;

      await axios.put(
        `${BASE_URL}/disbursements/single/approve`,
        {
          merchantAccountNumber: MERCHANT,
          transactionReferenceNumber: txRef,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Accept-Language": "en",
            "X-Idempotency-Key": `approve-${ref}`,
          },
        },
      );

      console.log(`  ✅ Disbursement ${i + 1}/${count} approved`);
    } catch (err) {
      console.error(
        `  ❌ Disbursement ${i + 1}/${count} failed:`,
        err.response?.data?.detail || err.message,
      );
    }
  }
}

(async () => {
  try {
    console.log("🚀 Starting disbursement-only KYC run...");
    const token = await getToken();
    const connectorId = await getActiveConnector(token);
    console.log(`✅ Using connector ID: ${connectorId}`);
    await createDisbursements(token, connectorId, 10);
    console.log("\n🎉 Done! Refresh the OneKhusa eligibility modal.");
  } catch (err) {
    console.error("❌ Script failed:", err.response?.data || err.message);
  }
})();
