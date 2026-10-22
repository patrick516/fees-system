// require("dotenv").config();
// const axios = require("axios");

// const BASE_URL = "https://api.onekhusa.com/sandbox/v1";
// const MERCHANT = 75480583; // Platform Account
// const EMAIL = "kulinjipatricks@gmail.com";

// async function run() {
//   try {
//     console.log("🔑 Getting OneKhusa token...");
//     const tokenRes = await axios.post(`${BASE_URL}/account/getAccessToken`, {
//       apiKey: process.env.ONEKHUSA_API_KEY,
//       apiSecret: process.env.ONEKHUSA_API_SECRET,
//       organisationId: process.env.ONEKHUSA_ORGANISATION_ID,
//       merchantAccountNumber: MERCHANT,
//     });
//     const token = tokenRes.data.accessToken;
//     const headers = {
//       Authorization: `Bearer ${token}`,
//       "Accept-Language": "en",
//       "Content-Type": "application/json",
//     };

//     console.log("🔌 Finding active connector...");
//     const connRes = await axios.get(`${BASE_URL}/core/connectors/GetAll`, {
//       headers,
//     });
//     const connector = connRes.data.find((c) => c.isActive === true);

//     console.log("🚀 Generating 10 Collection Webhooks...\n");

//     for (let i = 1; i <= 10; i++) {
//       const uniqueRef = `TESTWEB${Date.now()}${i}`;

//       // 1. Initiate Request to Pay
//       const initRes = await axios.post(
//         `${BASE_URL}/collections/requestToPay/initiate`,
//         {
//           merchantAccountNumber: MERCHANT,
//           transactionAmount: 100,
//           transactionDescription: `Test Webhook ${i}`,
//           referenceNumber: uniqueRef,
//           capturedBy: EMAIL,
//         },
//         { headers: { ...headers, "X-Idempotency-Key": uniqueRef } },
//       );

//       const tan = initRes.data.timedAccountNumber;

//       // 2. Simulate the Payment for that TAN
//       await axios.post(
//         `${BASE_URL}/collections/requestToPay/addFakeTransaction`,
//         {
//           merchantAccountNumber: MERCHANT,
//           transactionAmount: 100,
//           connectorId: connector.connectorId,
//           timedAccountNumber: tan,
//           currencyCode: "MWK",
//           capturedBy: EMAIL,
//         },
//         { headers: { ...headers, "X-Idempotency-Key": `pay-${uniqueRef}` } },
//       );

//       console.log(`✅ ${i}/10 - Webhook fired for TAN: ${tan}`);
//     }

//     console.log(
//       "\n🎉 DONE! 10 Collection Webhooks have been sent to your Render backend.",
//     );
//   } catch (err) {
//     console.error("❌ Error:", err.response?.data || err.message);
//   }
// }

// run();
