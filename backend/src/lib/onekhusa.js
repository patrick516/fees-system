// backend/src/lib/onekhusa.js
const axios = require("axios");

const BASE_URL =
  process.env.ONEKHUSA_ENV === "production"
    ? "https://api.onekhusa.com/v1"
    : "https://api.onekhusa.com/sandbox/v1";

// ==================== TOKEN CACHE ====================
let cachedToken = null;
let tokenExpiresAt = 0;

const getAccessToken = async (merchantAccountNumber) => {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 30_000) {
    return cachedToken;
  }

  // 🎯 FIX: If no merchant account is passed in, throw an error instead of falling back to a hardcoded one.
  if (!merchantAccountNumber) {
    throw new Error("No merchant account number provided to OneKhusa");
  }

  const { data } = await axios.post(
    `${BASE_URL}/account/getAccessToken`,
    {
      apiKey: process.env.ONEKHUSA_API_KEY,
      apiSecret: process.env.ONEKHUSA_API_SECRET,
      organisationId: process.env.ONEKHUSA_ORGANISATION_ID,
      merchantAccountNumber: parseInt(merchantAccountNumber, 10),
    },
    {
      headers: { "Content-Type": "application/json", "Accept-Language": "en" },
      timeout: 15000,
    },
  );

  cachedToken = data.accessToken;
  tokenExpiresAt = new Date(data.expiresOn).getTime();
  console.log(
    `[onekhusa] Token refreshed using merchant ${merchantAccountNumber}`,
  );
  return cachedToken;
};

// ==================== AUTHENTICATED REQUEST ====================
const authedRequest = async (
  method,
  path,
  body,
  extraHeaders = {},
  merchantAccountNumber,
) => {
  const token = await getAccessToken(merchantAccountNumber);

  const config = {
    method,
    url: `${BASE_URL}${path}`,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept-Language": "en",
      ...extraHeaders,
    },
    timeout: 20000,
  };
  if (body) config.data = body;

  const res = await axios(config);
  return res.data;
};

// ==================== REQUEST TO PAY (TAN) ====================
const requestToPay = async ({
  merchantAccountNumber,
  referenceNumber,
  amount,
  description,
  capturedBy,
}) => {
  return authedRequest(
    "POST",
    "/collections/requestToPay/initiate",
    {
      merchantAccountNumber: parseInt(merchantAccountNumber, 10),
      transactionAmount: Number(amount),
      transactionDescription: description,
      referenceNumber,
      capturedBy,
    },
    {
      "X-Idempotency-Key": `rtp-${referenceNumber}`,
    },
    merchantAccountNumber,
  );
};

module.exports = {
  getAccessToken,
  requestToPay,
};
