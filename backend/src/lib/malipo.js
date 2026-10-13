const axios = require("axios");

const BASE_URL = process.env.MALIPO_BASE_URL;

// Confirmed from GET /account/payment-channels
const PSP_IDS = { AIRTEL: 1, MPAMBA: 2 };

const credentials = () => ({
  apiKey: process.env.MALIPO_COLLECTION_API_KEY,
  appId: process.env.MALIPO_COLLECTION_APP_ID,
});

//  INITIATE PAYMENT
async function requestPayment({
  method,
  merchantTrxId,
  customerPhone,
  amount,
}) {
  const psp_id = PSP_IDS[method];
  if (!psp_id) throw new Error(`Unsupported Malipo method: ${method}`);

  const { apiKey, appId } = credentials();

  const response = await axios.post(
    `${BASE_URL}/transactions/collect`,
    {
      order_id: merchantTrxId,
      msisdn: customerPhone,
      psp_id,
      amount,
    },
    {
      headers: { "x-api-key": apiKey, "x-app-id": appId },
      timeout: 15000,
    },
  );

  return response.data;
}

//  CHECK TRANSACTION
async function enquireTransaction({ orderId }) {
  const { apiKey, appId } = credentials();
  const response = await axios.get(`${BASE_URL}/transactions/${orderId}/find`, {
    headers: { "x-api-key": apiKey, "x-app-id": appId },
    timeout: 15000,
  });
  return response.data;
}

//  BALANCE (admin only)
async function getCollectionBalance() {
  const { apiKey, appId } = credentials();
  const response = await axios.get(`${BASE_URL}/account/balance`, {
    headers: { "x-api-key": apiKey, "x-app-id": appId },
    timeout: 15000,
  });
  return response.data;
}

module.exports = {
  requestPayment,
  enquireTransaction,
  getCollectionBalance,
};
