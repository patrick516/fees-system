// backend/src/lib/emailTemplates.js
// Simple HTML email templates. All wrapped in a shared layout.

const wrap = (title, bodyHtml) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
      ${bodyHtml}
    </div>
    <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:16px;">
      This is an automated message. Please do not reply.
    </p>
  </div>
</body>
</html>
`;

const heading = (text) =>
  `<h2 style="margin:0 0 16px;color:#1e293b;font-size:20px;font-weight:600;">${text}</h2>`;

const para = (text) =>
  `<p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">${text}</p>`;

const button = (text, url) =>
  `<a href="${url}" style="display:inline-block;background:#1e3a8a;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;margin-top:8px;">${text}</a>`;

const infoBox = (label, value) => `
  <div style="background:#f1f5f9;border-radius:12px;padding:16px;margin:16px 0;">
    <p style="margin:0 0 4px;color:#64748b;font-size:11px;text-transform:uppercase;font-weight:600;letter-spacing:0.5px;">${label}</p>
    <p style="margin:0;color:#1e293b;font-size:18px;font-weight:700;font-family:'Courier New',monospace;">${value}</p>
  </div>
`;

const footer = (schoolName) =>
  `<p style="margin:24px 0 0;color:#94a3b8;font-size:11px;">— ${schoolName}</p>`;

const templates = {
  // ==================== BULK ALERTS ====================

  fee_reminder: ({ schoolName, parentName, message }) =>
    wrap(
      `Fee Reminder — ${schoolName}`,
      heading("Fee Reminder") +
        para(`Dear ${parentName},`) +
        para(message) +
        footer(schoolName),
    ),

  unpaid: ({ schoolName, parentName, message }) =>
    wrap(
      `Unpaid Fees — ${schoolName}`,
      heading("Unpaid Fees Notice") +
        para(`Dear ${parentName},`) +
        para(message) +
        footer(schoolName),
    ),

  announcement: ({ schoolName, parentName, message }) =>
    wrap(
      `Announcement — ${schoolName}`,
      heading("Announcement") +
        para(`Dear ${parentName},`) +
        para(message) +
        footer(schoolName),
    ),

  // ==================== PAYMENT EVENTS ====================

  payment_received: ({
    schoolName,
    parentName,
    studentName,
    amount,
    receiptNumber,
    balanceAfter,
    overpayment,
    currency = "MWK",
  }) => {
    const amountStr = `${currency} ${Number(amount).toLocaleString()}`;
    const balanceLine =
      overpayment > 0
        ? `Fees fully paid! ${currency} ${overpayment.toLocaleString()} credit saved for next term.`
        : balanceAfter > 0
          ? `Balance remaining: ${currency} ${balanceAfter.toLocaleString()}`
          : "Fees fully paid!";

    return wrap(
      `Payment Received — ${schoolName}`,
      heading("Payment Received") +
        para(
          `Dear ${parentName}, we've received a payment for <strong>${studentName}</strong>.`,
        ) +
        infoBox("Amount", amountStr) +
        para(`Receipt Number: <strong>${receiptNumber}</strong>`) +
        para(balanceLine) +
        footer(schoolName),
    );
  },

  payment_verified: ({
    schoolName,
    parentName,
    studentName,
    amount,
    receiptNumber,
    balanceAfter,
    currency = "MWK",
  }) => {
    const amountStr = `${currency} ${Number(amount).toLocaleString()}`;
    const balanceLine =
      balanceAfter && balanceAfter > 0
        ? `Balance remaining: ${currency} ${balanceAfter.toLocaleString()}`
        : "Fees fully paid!";

    return wrap(
      `Payment Confirmed — ${schoolName}`,
      heading("Payment Confirmed") +
        para(
          `Dear ${parentName}, we've verified your payment for <strong>${studentName}</strong>.`,
        ) +
        infoBox("Amount", amountStr) +
        para(`Receipt Number: <strong>${receiptNumber}</strong>`) +
        para(balanceLine) +
        footer(schoolName),
    );
  },

  payment_rejected: ({ schoolName, parentName, studentName, reason }) =>
    wrap(
      `Payment Rejected — ${schoolName}`,
      heading("Payment Could Not Be Verified") +
        para(
          `Dear ${parentName}, we were unable to verify the payment for <strong>${studentName}</strong>.`,
        ) +
        infoBox("Reason", reason) +
        para(
          "Please review the details and resubmit through the parent portal.",
        ) +
        footer(schoolName),
    ),
};

/**
 * Renders a template by key.
 * Falls back to a plain paragraph if the key doesn't exist.
 */
const renderTemplate = (key, data) => {
  const fn = templates[key];
  if (fn) return fn(data);

  // Fallback
  return wrap(
    data.schoolName || "School Notification",
    heading(data.subject || "Notification") +
      para(data.message || "") +
      footer(data.schoolName || ""),
  );
};

module.exports = { renderTemplate };
