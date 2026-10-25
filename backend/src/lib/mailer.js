// backend/src/lib/mailer.js
const axios = require("axios");

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_NAME = process.env.BREVO_SENDER_NAME || "SchoolPay";
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;

// Reusable logo HTML to keep templates clean
const LOGO_HEADER = `
  <div style="text-align: center; margin-bottom: 24px;">
    <img src="https://fees-system-one.vercel.app/images/SchoolPayLogo.jpg" alt="SchoolPay" width="64" height="64" style="border-radius: 12px; object-fit: contain;" />
  </div>
`;

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
        
        ${LOGO_HEADER}

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

//  INVITATION EMAIL (School Staff)
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

        ${LOGO_HEADER}

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

//  PLATFORM SCHOOL INVITE EMAIL (Owner invites School Admin)
const sendPlatformSchoolInviteEmail = async ({
  to,
  name,
  inviteToken,
  tempPassword,
  expiresInDays = 7,
}) => {
  const acceptUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/accept-invite?token=${inviteToken}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #f8fafc;">
      <div style="background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
        
        ${LOGO_HEADER}

        <h2 style="margin: 0 0 8px; color: #1e293b; font-size: 20px;">You're invited to SchoolPay</h2>
        <p style="margin: 0 0 20px; color: #64748b; font-size: 14px; line-height: 1.5;">
          Hi ${name || "there"},
        </p>
        <p style="margin: 0 0 20px; color: #64748b; font-size: 14px; line-height: 1.5;">
          You've been invited to set up and manage a school on <strong>SchoolPay</strong>.
          Choose one of the two options below to get started.
        </p>

        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
          <p style="margin: 0 0 8px; color: #1e3a8a; font-size: 12px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">
            Option 1 — Set Your Own Password
          </p>
          <p style="margin: 0 0 12px; color: #475569; font-size: 13px; line-height: 1.5;">
            Click the button below. You'll be prompted to create a password
            of your choice, then log in with it.
          </p>
          <a href="${acceptUrl}" style="display: inline-block; background: #1e3a8a; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 600;">
            Accept Invitation →
          </a>
        </div>

        <div style="background: #f1f5f9; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
          <p style="margin: 0 0 8px; color: #475569; font-size: 12px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">
            Option 2 — Use a Temporary Password
          </p>
          <p style="margin: 0 0 12px; color: #475569; font-size: 13px; line-height: 1.5;">
            Log in with the temporary password below. You'll be asked to
            change it on first login.
          </p>
          <p style="margin: 0; font-size: 18px; font-weight: 700; color: #1e3a8a; font-family: 'Courier New', monospace; letter-spacing: 1px;">
            ${tempPassword}
          </p>
        </div>

        <p style="margin: 0 0 8px; color: #64748b; font-size: 13px; line-height: 1.5;">
          <strong>Login email:</strong> ${to}
        </p>

        <p style="margin: 24px 0 0; color: #94a3b8; font-size: 11px; line-height: 1.5;">
          Both the invitation link and the temporary password expire in ${expiresInDays} days.
          If the button doesn't work, paste this into your browser:<br>
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
    subject: "You're invited to SchoolPay",
    htmlContent: html,
  });
};

//  PASSWORD RESET
const sendPasswordResetEmail = async ({
  to,
  name,
  resetToken,
  expiresInMinutes = 30,
}) => {
  const resetUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/reset-password?token=${resetToken}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #f8fafc;">
      <div style="background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">

        ${LOGO_HEADER}

        <h2 style="margin: 0 0 8px; color: #1e293b; font-size: 20px;">Reset your password</h2>
        <p style="margin: 0 0 24px; color: #64748b; font-size: 14px; line-height: 1.6;">
          Hi ${name || "there"}, we received a request to reset your SchoolPay password.
          Click the button below to choose a new one. This link expires in ${expiresInMinutes} minutes.
        </p>

        <a href="${resetUrl}" style="display: inline-block; background: #1e3a8a; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 14px; font-weight: 600;">
          Reset Password →
        </a>

        <p style="margin: 24px 0 0; color: #94a3b8; font-size: 12px; line-height: 1.6;">
          If you didn't request this, you can safely ignore this email — your password won't change.
        </p>

        <p style="margin: 16px 0 0; color: #94a3b8; font-size: 11px; line-height: 1.5;">
          Button not working? Paste this into your browser:<br>
          <span style="color: #64748b; word-break: break-all;">${resetUrl}</span>
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
    subject: "Reset your SchoolPay password",
    htmlContent: html,
  });
};
//  SUPPORT REPLY (Platform Owner → School Admin)
const sendSupportReplyEmail = async ({
  to,
  name,
  schoolName,
  subject,
  replyPreview,
}) => {
  const loginUrl = `${process.env.CLIENT_URL || "https://fees-system-one.vercel.app"}/platform/login`;
  const preview =
    replyPreview.length > 200
      ? `${replyPreview.slice(0, 200)}...`
      : replyPreview;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #f8fafc;">
      <div style="background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">

        ${LOGO_HEADER}

        <h2 style="margin: 0 0 8px; color: #1e293b; font-size: 20px;">SchoolPay Support replied</h2>
        <p style="margin: 0 0 16px; color: #64748b; font-size: 14px; line-height: 1.5;">
          Hi ${name || "there"}, SchoolPay Support has replied to your ticket for <strong>${schoolName}</strong>.
        </p>

        <div style="background: #f1f5f9; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
          <p style="margin: 0 0 4px; color: #475569; font-size: 11px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">
            Subject
          </p>
          <p style="margin: 0 0 12px; color: #1e293b; font-size: 14px; font-weight: 600;">
            ${subject}
          </p>
          <p style="margin: 0 0 4px; color: #475569; font-size: 11px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">
            Reply preview
          </p>
          <p style="margin: 0; color: #475569; font-size: 13px; font-style: italic; line-height: 1.5;">
            "${preview}"
          </p>
        </div>

        <a href="${loginUrl}" style="display: inline-block; background: #1e3a8a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;">
          View Full Reply →
        </a>

        <p style="margin: 24px 0 0; color: #94a3b8; font-size: 11px; line-height: 1.5;">
          Log in to your portal to read the full reply and respond.
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
    subject: `Reply from SchoolPay Support — ${subject}`,
    htmlContent: html,
  });
};
module.exports = {
  sendEmail,
  sendOtpEmail,
  sendInvitationEmail,
  sendPlatformSchoolInviteEmail,
  sendPasswordResetEmail,
  sendSupportReplyEmail,
};
