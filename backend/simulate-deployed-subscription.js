require("dotenv").config();
const axios = require("axios");

const BASE_URL = "https://api.onekhusa.com/sandbox/v1";
const MERCHANT = 75480583; // Platform account
const EMAIL = "kulinjipatricks@gmail.com";

// 🎯 HARDCODED FROM YOUR SCREENSHOT (TAN 15888480, MWK 250,000)
const TAN = "15888480";
const AMOUNT = 250000;

async function simulate() {
  try {
    console.log("🚀 Bypassing database entirely. Getting token...");

    // Get OneKhusa token using PLATFORM merchant account
    const tokenRes = await axios.post(`${BASE_URL}/account/getAccessToken`, {
      apiKey: process.env.ONEKHUSA_API_KEY,
      apiSecret: process.env.ONEKHUSA_API_SECRET,
      organisationId: process.env.ONEKHUSA_ORGANISATION_ID,
      merchantAccountNumber: MERCHANT,
    });
    const token = tokenRes.data.accessToken;
    console.log("✅ Got OneKhusa token");

    // Get Valid Connector
    const connRes = await axios.get(`${BASE_URL}/core/connectors/GetAll`, {
      headers: { Authorization: `Bearer ${token}`, "Accept-Language": "en" },
    });
    const activeConnector = connRes.data.find((c) => c.isActive === true);
    if (!activeConnector) {
      throw new Error("No active connector found");
    }

    // Simulate Payment directly against OneKhusa
    console.log(`💸 Simulating payment for TAN ${TAN} (MWK ${AMOUNT})...`);
    await axios.post(
      `${BASE_URL}/collections/requestToPay/addFakeTransaction`,
      {
        merchantAccountNumber: MERCHANT,
        transactionAmount: AMOUNT,
        connectorId: activeConnector.connectorId,
        timedAccountNumber: TAN,
        currencyCode: "MWK",
        capturedBy: EMAIL,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept-Language": "en",
          "X-Idempotency-Key": `fake-deploy-${Date.now()}`,
        },
      },
    );

    console.log("✅ Payment simulated successfully!");
    console.log(
      "🎉 OneKhusa will now send the webhook to Render. Watch the deployed frontend—it should turn green momentarily!",
    );
  } catch (err) {
    console.error("❌ Error:", err.response?.data || err.message);
  }
}

simulate();
