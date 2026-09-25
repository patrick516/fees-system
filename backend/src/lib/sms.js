// TumaSend integration — SMS + OTP service
// https://gateway.tumasend.com

const TUMASEND_BASE = "https://gateway.tumasend.com";

// Low-level helper — every call goes through here
const tumaSendPost = async (path, body, apiKey) => {
  console.log("→ TumaSend Request:", path, JSON.stringify(body, null, 2));

  const res = await fetch(`${TUMASEND_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  console.log("← TumaSend Response Status:", res.status);
  console.log("← TumaSend Response Body:", JSON.stringify(data, null, 2));

  if (!res.ok) {
    const errorMsg =
      data.message || data.error || data.detail || JSON.stringify(data);
    throw new Error(errorMsg);
  }

  return data;
};

// ==================== BULK SMS ====================
// Uses the SMS key (bound to a regular sender ID, has sms:send scope)
const sendSMS = async (phone, message) => {
  const apiKey = process.env.TUMASEND_SMS_KEY;
  if (!apiKey) {
    throw new Error("TUMASEND_SMS_KEY not set in environment");
  }

  const data = await tumaSendPost(
    "/api/v1/send/sms",
    {
      from: process.env.TUMASEND_SMS_SENDER_ID || "TumaSend",
      recipients: [phone],
      message,
    },
    apiKey,
  );

  return {
    messageId: data.batch_id,
    cost: data.credits_used,
    provider: "tumasend",
  };
};

// ==================== OTP ====================
// Uses the OTP key (bound to an OTP sender, has otp:send scope)
const sendOtp = async (phone) => {
  const apiKey = process.env.TUMASEND_API_KEY;
  if (!apiKey) {
    throw new Error("TUMASEND_API_KEY not set in environment");
  }

  const requestId = `otp_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

  const data = await tumaSendPost(
    "/api/v1/otp/send",
    {
      request_id: requestId,
      phone_number: phone,
      channel: "sms",
      length: 6,
      expiry_seconds: 600,
    },
    apiKey,
  );

  return {
    otpId: data.request_id,
    expiresAt: data.expires_at,
  };
};

const verifyOtp = async (otpId, code) => {
  const apiKey = process.env.TUMASEND_API_KEY;
  if (!apiKey) {
    throw new Error("TUMASEND_API_KEY not set in environment");
  }

  const data = await tumaSendPost(
    "/api/v1/otp/verify",
    {
      request_id: otpId,
      code: code,
    },
    apiKey,
  );

  return { verified: !!data.verified };
};

module.exports = { sendSMS, sendOtp, verifyOtp };
