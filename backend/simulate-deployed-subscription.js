require("dotenv").config();
const axios = require("axios");
const { PrismaClient } = require("@prisma/client");

// Connect to Production Database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_wdyo9WbHV7aT@ep-dawn-recipe-agnrmjbq.c-2.eu-central-1.aws.neon.tech:5432/neondb?sslmode=require",
    },
  },
});

const BASE_URL = "https://api.onekhusa.com/sandbox/v1";
const MERCHANT = 75480583; // Platform account
const EMAIL = "kulinjipatricks@gmail.com";

async function simulate() {
  try {
    console.log("🔍 Finding latest pending subscription payment in Neon DB...");

    // 1. Get the latest pending subscription payment
    const payment = await prisma.subscriptionPayment.findFirst({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });

    if (!payment || !payment.onekhusaTimedAccount) {
      console.log("❌ No pending subscription payment found.");
      console.log(
        "👉 Please go to the deployed Chichiri School Portal and click 'Generate Account Number' first.",
      );
      process.exit(1);
    }

    console.log(
      `✅ Found TAN: ${payment.onekhusaTimedAccount} for MWK ${payment.amount}`,
    );

    // 2. Get Token
    const tokenRes = await axios.post(`${BASE_URL}/account/getAccessToken`, {
      apiKey: process.env.ONEKHUSA_API_KEY,
      apiSecret: process.env.ONEKHUSA_API_SECRET,
      organisationId: process.env.ONEKHUSA_ORGANISATION_ID,
      merchantAccountNumber: MERCHANT,
    });
    const token = tokenRes.data.accessToken;
    console.log("✅ Got OneKhusa token");

    // 3. Get Valid Connector
    const connRes = await axios.get(`${BASE_URL}/core/connectors/GetAll`, {
      headers: { Authorization: `Bearer ${token}`, "Accept-Language": "en" },
    });
    const activeConnector = connRes.data.find((c) => c.isActive === true);

    // 4. Simulate Payment
    console.log("💸 Simulating payment on OneKhusa...");
    await axios.post(
      `${BASE_URL}/collections/requestToPay/addFakeTransaction`,
      {
        merchantAccountNumber: MERCHANT,
        transactionAmount: payment.amount,
        connectorId: activeConnector.connectorId,
        timedAccountNumber: payment.onekhusaTimedAccount,
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
  } finally {
    await prisma.$disconnect();
  }
}

simulate();
