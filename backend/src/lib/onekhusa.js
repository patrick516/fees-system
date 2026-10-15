// backend/src/lib/onekhusa.js
const axios = require("axios");

const BASE_URL =
  process.env.ONEKHUSA_ENV === "production"
    ? "https://api.onekhusa.com/v1"
    : "https://api.onekhusa.com/sandbox/v1";

//  TOKEN CACHE
// Tokens last 5 minutes. Cache them until ~30s before expiry.
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
      merchantAccountNumber: parseInt(
        process.env.ONEKHUSA_MERCHANT_ACCOUNT,
        10,
      ),
    },
    {
      headers: {
        "Content-Type": "application/json",
        "Accept-Language": "en",
      },
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

//  AUTHENTICATED REQUEST
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

//  REQUEST TO PAY (TAN)
/**
 * Initiates a Request-to-Pay. Returns a TAN (timed account number)
 * the customer will send money to.
 *
 * referenceNumber: our merchant reference (payment UUID). Must be 5-25
 *                  alphanumeric chars. We use the payment UUID with dashes.
 */
const requestToPay = async ({
  referenceNumber,
  amount,
  description,
  capturedBy,
}) => {
  return authedRequest(
    "POST",
    "/collections/requestToPay/initiate",
    {
      merchantAccountNumber: parseInt(
        process.env.ONEKHUSA_MERCHANT_ACCOUNT,
        10,
      ),
      transactionAmount: Number(amount),
      transactionDescription: description,
      referenceNumber,
      capturedBy,
    },
    {
      // Required for idempotency
      "X-Idempotency-Key": `rtp-${referenceNumber}`,
    },
  );
};

module.exports = {
  getAccessToken,
  requestToPay,
};
