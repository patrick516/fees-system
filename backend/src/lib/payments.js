// backend/src/lib/payments.js
import { ChiaSDK } from "@chiahq/sdk";

// Initialize with the providers you have credentials for.
// You can start with just one (e.g., PayChangu) and add others later.
const sdk = ChiaSDK.initialize({
  paychangu: {
    secretKey: process.env.PAYCHANGU_SECRET_KEY,
  },
  pawapay: {
    jwt: process.env.PAWAPAY_JWT,
  },
  onekhusa: {
    apiKey: process.env.ONEKHUSA_API_KEY,
    apiSecret: process.env.ONEKHUSA_API_SECRET,
    organisationId: process.env.ONEKHUSA_ORG_ID,
  },
});

// Initiate a payment
export const initiatePayment = async (paymentData) => {
  try {
    // The SDK automatically routes the request based on the `country` and `currency`.
    // It will try PayChangu first, then PawaPay, then OneKhusa[reference:10].
    const payment = await sdk.payments.initiate({
      reference: paymentData.reference, // Your unique order ID
      amount: paymentData.amount, // e.g., "200000"
      currency: paymentData.currency, // e.g., "MWK"
      msisdn: paymentData.phone, // e.g., "265995049331"
      country: paymentData.country, // e.g., "MWI"
      description: paymentData.description,
    });

    return payment;
  } catch (error) {
    console.error("Payment initiation failed:", error);
    throw new Error("Could not start payment. Please try again.");
  }
};
outer.post("/pawapay/webhook", malipoController.webhook);

// You can also specifically pin a provider if you prefer:
// const payment = await sdk.payments.initiate({ ...paymentData, provider: "pawapay" });
