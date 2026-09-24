// TumaSend integration — SMS + OTP service
// https://gateway.tumasend.com

const TUMASEND_BASE = "https://gateway.tumasend.com";

const tumaSendPost = async (path, body) => {
  const res = await fetch(`${TUMASEND_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.TUMASEND_API_KEY,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || "TumaSend request failed");
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

// Request an OTP — TumaSend generates, stores, and sends it
// Returns { otpId, expiresAt }
const sendOtp = async (phone) => {
  const data = await tumaSendPost("/api/v1/otp/send", {
    recipient: phone,
    channel: "sms",
    length: 6,
    expiry_seconds: 600, // 10 minutes, matches your old expiry
  });
  return { otpId: data.otp_id, expiresAt: data.expires_at };
};

// Verify an OTP code against TumaSend's stored copy
// Returns { verified: boolean }
const verifyOtp = async (otpId, code) => {
  const data = await tumaSendPost("/api/v1/otp/verify", {
    otp_id: otpId,
    code,
  });
  return { verified: !!data.verified };
};

module.exports = { sendSMS, sendOtp, verifyOtp };
