require("dotenv").config();
const axios = require("axios");
const prisma = require("./src/config/db");

async function simulatePayment() {
  try {
    // 1. Find the latest pending payment
    const payment = await prisma.subscriptionPayment.findFirst({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });

    if (!payment || !payment.onekhusaTimedAccount) {
      console.log("❌ No pending payment found with a TAN.");
      process.exit(1);
    }

    console.log(`🔍 Found pending payment (Amount: ${payment.amount})`);
    console.log(`✅ Using TAN: ${payment.onekhusaTimedAccount}`);

    // 2. Get Token
    const tokenRes = await axios.post(
      "https://api.onekhusa.com/sandbox/v1/account/getAccessToken",
      {
        apiKey: process.env.ONEKHUSA_API_KEY,
        apiSecret: process.env.ONEKHUSA_API_SECRET,
        organisationId: process.env.ONEKHUSA_ORGANISATION_ID,
        merchantAccountNumber: 75480583,
      },
    );
    const token = tokenRes.data.accessToken;
    console.log("✅ 1. Got token successfully");

    // 3. Get Valid Connector
    const connRes = await axios.get(
      "https://api.onekhusa.com/sandbox/v1/core/connectors/GetAll",
      {
        headers: { Authorization: `Bearer ${token}`, "Accept-Language": "en" },
      },
    );
    const activeConnector = connRes.data.find((c) => c.isActive === true);

    console.log(`✅ 2. Found connector: ${activeConnector.connectorName}`);

    // 4. Simulate Payment
    const payRes = await axios.post(
      "https://api.onekhusa.com/sandbox/v1/collections/requestToPay/addFakeTransaction",
      {
        merchantAccountNumber: 75480583,
        transactionAmount: payment.amount,
        connectorId: activeConnector.connectorId,
        timedAccountNumber: payment.onekhusaTimedAccount,
        currencyCode: payment.currency || "MWK",
        capturedBy: "kulinjipatricks@gmail.com",
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept-Language": "en",
          "X-Idempotency-Key": `fake-${Date.now()}`,
        },
      },
    );

    console.log("✅ 3. Payment simulated successfully on OneKhusa!");

    // 🎯 5. Manually trigger the webhook to LOCALHOST
    console.log("📡 Forcing webhook to localhost...");

    const webhookPayload = {
      beneficiaryAccountNumber: "75480583", // Platform merchant account
      transactionReferenceNumber:
        payRes.data.transaction.transactionReferenceNumber,
      transactionStatusCode: "S",
      metaData: {
        referenceNumber: payment.onekhusaTransactionRef,
      },
    };

    try {
      await axios.post(
        "http://localhost:5000/api/payments/onekhusa/webhook",
        webhookPayload,
        {
          headers: {
            "x-onekhusa-webhook-event": "payrequest.success",
            "Content-Type": "application/json",
          },
        },
      );
      console.log("✅ 4. Webhook successfully sent to localhost!");
      console.log(
        "\n🎉 Check your frontend — it should turn green momentarily!",
      );
    } catch (webhookErr) {
      console.error(
        "❌ Failed to send webhook to localhost. Is your backend running?",
      );
    }
  } catch (err) {
    console.error("❌ Error:", err.response?.data || err.message);
  } finally {
    await prisma.$disconnect();
  }
}

simulatePayment();
