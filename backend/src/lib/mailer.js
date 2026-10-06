// backend/src/lib/mailer.js
const axios = require("axios");

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_NAME = process.env.BREVO_SENDER_NAME || "SchoolPay";
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;

const sendEmail = async ({ to, toName, subject, htmlContent }) => {
  if (!BREVO_API_KEY) {
    console.warn("⚠️  BREVO_API_KEY missing — email not sent:", subject);
    return { skipped: true };
  }

  try {
    const res = await axios.post(
      BREVO_API_URL,
      {
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email: to, name: toName || to }],
        subject,
        htmlContent,
      },
      {
        headers: {
          "api-key": BREVO_API_KEY,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 15000,
      },
    );
    return { success: true, messageId: res.data?.messageId };
  } catch (err) {
    console.error("Brevo send failed:", err.response?.data || err.message);
    return { success: false, error: err.response?.data || err.message };
  }
};

// ==================== OTP EMAIL ====================
const sendOtpEmail = async ({
  to,
  name,
  otp,
  purpose = "verify your email",
}) => {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #f8fafc;">
      <div style="background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
        <h2 style="margin: 0 0 8px; color: #1e293b; font-size: 20px;">Verify your email</h2>
        <p style="margin: 0 0 24px; color: #64748b; font-size: 14px; line-height: 1.5;">
          Hi ${name || "there"}, use the code below to ${purpose}. It expires in 10 minutes.
        </p>
        <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1e3a8a; font-family: 'Courier New', monospace;">
            ${otp}
          </p>
        </div>
        <p style="margin: 0; color: #94a3b8; font-size: 12px;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
      <p style="text-align: center; color: #94a3b8; font-size: 11px; margin-top: 16px;">
        ${SENDER_NAME} • Automated message, please do not reply
      </p>
    </div>
  `;
  return sendEmail({
    to,
    toName: name,
    subject: "Your verification code",
    htmlContent: html,
  });
};

// ==================== INVITATION EMAIL ====================
const sendInvitationEmail = async ({
  to,
  name,
  schoolName,
  role,
  tempPassword,
  inviteToken,
}) => {
  const acceptUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/accept-invite?token=${inviteToken}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #f8fafc;">
      <div style="background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
        <h2 style="margin: 0 0 8px; color: #1e293b; font-size: 20px;">You've been invited</h2>
        <p style="margin: 0 0 20px; color: #64748b; font-size: 14px; line-height: 1.5;">
          <strong>${schoolName}</strong> has invited you to join as a <strong>${role}</strong>.
        </p>

        <div style="background: #f1f5f9; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
          <p style="margin: 0 0 8px; color: #475569; font-size: 12px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">
            Temporary Password
          </p>
          <p style="margin: 0; font-size: 18px; font-weight: 700; color: #1e3a8a; font-family: 'Courier New', monospace;">
            ${tempPassword}
          </p>
        </div>

        <p style="margin: 0 0 20px; color: #64748b; font-size: 13px; line-height: 1.5;">
          Click the button below to accept the invitation. You'll be prompted to set your own password on first login.
        </p>

        <a href="${acceptUrl}" style="display: inline-block; background: #1e3a8a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;">
          Accept Invitation →
        </a>

        <p style="margin: 24px 0 0; color: #94a3b8; font-size: 11px; line-height: 1.5;">
          This invitation expires in 7 days. If the button doesn't work, paste this into your browser:<br>
          <span style="color: #64748b; word-break: break-all;">${acceptUrl}</span>
        </p>
      </div>
      <p style="text-align: center; color: #94a3b8; font-size: 11px; margin-top: 16px;">
        ${SENDER_NAME} • Automated message, please do not reply
      </p>
    </div>
  `;
  return sendEmail({
    to,
    toName: name,
    subject: `You're invited to ${schoolName} on SchoolPay`,
    htmlContent: html,
  });
};

module.exports = { sendEmail, sendOtpEmail, sendInvitationEmail };
