// TumaSend integration — SMS + OTP service
// https://gateway.tumasend.com

const TUMASEND_BASE = "https://gateway.tumasend.com";

const tumaSendPost = async (path, body) => {
  console.log("→ TumaSend Request:", path, JSON.stringify(body, null, 2));

  const res = await fetch(`${TUMASEND_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.TUMASEND_API_KEY,
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

// Plain SMS (used for fee reminders, receipts, etc — not OTP)
const sendSMS = async (phone, message) => {
  const data = await tumaSendPost("/api/v1/send/sms", {
    from: process.env.TUMASEND_SENDER_ID || "TumaSend",
    recipients: [phone],
    message,
  });
  return {
    messageId: data.batch_id,
    cost: data.credits_used,
    provider: "tumasend",
  };
};

const sendOtp = async (phone) => {
  const requestId = `otp_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

  const data = await tumaSendPost("/api/v1/otp/send", {
    request_id: requestId,
    phone_number: phone,
    channel: "sms",
    length: 6,
    expiry_seconds: 600,
  });

  // TumaSend returns request_id (not otp_id)
  return {
    otpId: data.request_id, // ← use request_id
    expiresAt: data.expires_at,
  };
};
const verifyOtp = async (otpId, code) => {
  const data = await tumaSendPost("/api/v1/otp/verify", {
    request_id: otpId,
    code: code,
  });
  return { verified: !!data.verified };
};

module.exports = { sendSMS, sendOtp, verifyOtp };
