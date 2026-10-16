// backend/src/lib/onekhusa.js
const axios = require("axios");

const BASE_URL =
  process.env.ONEKHUSA_ENV === "production"
    ? "https://api.onekhusa.com/v1"
    : "https://api.onekhusa.com/sandbox/v1";

// ==================== TOKEN CACHE ====================
// Tokens are per-organisation, valid 5 min. Cache until ~30s before expiry.
let cachedToken = null;
let tokenExpiresAt = 0;

const getAccessToken = async () => {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 30_000) {
    return cachedToken;
  }

  const { data } = await axios.post(
    `${BASE_URL}/account/getAccessToken`,
    {
      apiKey: process.env.ONEKHUSA_API_KEY,
      apiSecret: process.env.ONEKHUSA_API_SECRET,
      organisationId: process.env.ONEKHUSA_ORGANISATION_ID,
      merchantAccountNumber: 75480583, // any valid merchant under our org works here
    },
    {
      headers: { "Content-Type": "application/json", "Accept-Language": "en" },
      timeout: 15000,
    },
  );

  cachedToken = data.accessToken;
  tokenExpiresAt = new Date(data.expiresOn).getTime();
  console.log(
    `[onekhusa] Token refreshed, expires in ${data.expiryInMinutes} min`,
  );
  return cachedToken;
};

// ==================== AUTHENTICATED REQUEST ====================
const authedRequest = async (method, path, body, extraHeaders = {}) => {
  const token = await getAccessToken();

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
// merchantAccountNumber is now a PARAM — each school passes its own
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
  );
};

module.exports = {
  getAccessToken,
  requestToPay,
};
