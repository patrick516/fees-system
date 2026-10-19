require("dotenv").config();
const axios = require("axios");
const prisma = require("./src/config/db");

async function simulateFeePayment() {
  try {
    // 1. Find the latest pending FEE payment (not subscription)
    const payment = await prisma.feePayment.findFirst({
      where: {
        status: "PENDING",
        paymentChannel: "ONEKHUSA",
      },
      include: { school: true }, // We need the school to get its merchant account
      orderBy: { createdAt: "desc" },
    });

    if (!payment || !payment.malipoCustomerRef) {
      console.log("❌ No pending fee payment found with a TAN.");
      console.log(
        "👉 Please go to the Parent Portal and generate a payment TAN first.",
      );
      process.exit(1);
    }

    const schoolMerchantAccount = payment.school.onekhusaMerchantAccount;
    if (!schoolMerchantAccount) {
      console.log(
        `❌ School ${payment.school.name} does not have a merchant account configured.`,
      );
      process.exit(1);
    }

    console.log(` Found pending payment for: ${payment.school.name}`);
    console.log(` Amount: ${payment.amount}`);
    console.log(` Using TAN: ${payment.malipoCustomerRef}`);
    console.log(` Using School Merchant Account: ${schoolMerchantAccount}`);
    // 2. Get Token using the SCHOOL'S merchant account
    const tokenRes = await axios.post(
      "https://api.onekhusa.com/sandbox/v1/account/getAccessToken",
      {
        apiKey: process.env.ONEKHUSA_API_KEY,
        apiSecret: process.env.ONEKHUSA_API_SECRET,
        organisationId: process.env.ONEKHUSA_ORGANISATION_ID,
        merchantAccountNumber: parseInt(schoolMerchantAccount, 10),
      },
    );
    const token = tokenRes.data.accessToken;
    console.log(" 1. Got token successfully");

    // 3. Get Valid Connector (Airtel Money, etc)
    const connRes = await axios.get(
      "https://api.onekhusa.com/sandbox/v1/core/connectors/GetAll",
      {
        headers: { Authorization: `Bearer ${token}`, "Accept-Language": "en" },
      },
    );
    const activeConnector = connRes.data.find((c) => c.isActive === true);

    console.log(` 2. Found connector: ${activeConnector.connectorName}`);

    // 4. Simulate Payment on OneKhusa
    const payRes = await axios.post(
      "https://api.onekhusa.com/sandbox/v1/collections/requestToPay/addFakeTransaction",
      {
        merchantAccountNumber: parseInt(schoolMerchantAccount, 10),
        transactionAmount: payment.amount,
        connectorId: activeConnector.connectorId,
        timedAccountNumber: payment.malipoCustomerRef,
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

    console.log(" 3. Payment simulated successfully on OneKhusa!");

    // 5. Force the webhook to LOCALHOST
    console.log(" Forcing webhook to localhost...");

    const webhookPayload = {
      beneficiaryAccountNumber: String(schoolMerchantAccount),
      transactionReferenceNumber:
        payRes.data.transaction.transactionReferenceNumber,
      transactionStatusCode: "S",
      metaData: {
        referenceNumber: payment.malipoTransactionId,
      },
      // Add these to simulate the real fee deductions
      beneficiary: {
        amountReceived: payRes.data.beneficiary.amountReceived, // e.g., 197,500
        accountNumber: payRes.data.beneficiary.accountNumber,
      },
      transaction: {
        transactionFee: payRes.data.transaction.transactionFee, // e.g., 2,500
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
        "\n🎉 Check the Parent Portal — the payment modal should turn green momentarily!",
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

simulateFeePayment();
