// backend/src/lib/notifier.js
const prisma = require("../config/db");
const { sendSMS } = require("./sms");
const { sendEmail } = require("./mailer");
const { renderTemplate } = require("./emailTemplates");

const BATCH_SIZE = 10;

/**
 * Send notifications to a list of recipients via SMS, Email, or both.
 *
 * @param {Object} opts
 * @param {Array}  opts.recipients   - [{ phone?, email?, name?, message, subject?, templateData? }]
 * @param {string} opts.channel      - "SMS" | "EMAIL" | "BOTH"
 * @param {string} opts.type         - "reminder" | "announcement" | ... (for logging)
 * @param {string} opts.templateKey  - template identifier for emails
 * @param {string} opts.schoolId
 * @param {string} [opts.staffId]    - who triggered this
 * @param {string} [opts.schoolName] - for email footer
 * @returns {Promise<{smsSent, emailSent, failed, total}>}
 */
const sendNotifications = async ({
  recipients,
  channel = "SMS",
  type,
  templateKey,
  schoolId,
  staffId = null,
  schoolName = "Your School",
}) => {
  const channelUpper = String(channel).toUpperCase();
  const shouldSMS = channelUpper === "SMS" || channelUpper === "BOTH";
  const shouldEmail = channelUpper === "EMAIL" || channelUpper === "BOTH";

  let smsSent = 0;
  let emailSent = 0;
  let failed = 0;
  const errors = [];

  // Split recipients by channel availability
  const smsRecipients = shouldSMS ? recipients.filter((r) => r.phone) : [];
  const emailRecipients = shouldEmail ? recipients.filter((r) => r.email) : [];

  // ==================== SMS BATCHES ====================
  for (let i = 0; i < smsRecipients.length; i += BATCH_SIZE) {
    const batch = smsRecipients.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (r) => {
        try {
          const result = await sendSMS(r.phone, r.message);

          await prisma.notificationLog.create({
            data: {
              schoolId,
              channel: "SMS",
              phone: r.phone,
              recipientName: r.name || null,
              message: r.message,
              type,
              status: "SENT",
              messageId: result?.messageId || null,
              cost: result?.cost != null ? String(result.cost) : null,
              sentById: staffId,
            },
          });

          smsSent++;
        } catch (err) {
          failed++;
          errors.push(`SMS ${r.phone}: ${err.message}`);

          try {
            await prisma.notificationLog.create({
              data: {
                schoolId,
                channel: "SMS",
                phone: r.phone,
                recipientName: r.name || null,
                message: r.message,
                type,
                status: "FAILED",
                errorMessage: err.message?.slice(0, 500) || "Unknown error",
                sentById: staffId,
              },
            });
          } catch {
            /* swallow logging errors */
          }
        }
      }),
    );
  }

  // ==================== EMAIL BATCHES ====================
  for (let i = 0; i < emailRecipients.length; i += BATCH_SIZE) {
    const batch = emailRecipients.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (r) => {
        try {
          const htmlContent = renderTemplate(templateKey || "announcement", {
            schoolName,
            parentName: r.name || "Parent",
            message: r.message,
            subject: r.subject || "Notification",
            ...(r.templateData || {}),
          });

          const subject = r.subject || `${schoolName} — Notification`;

          const result = await sendEmail({
            to: r.email,
            toName: r.name,
            subject,
            htmlContent,
          });

          await prisma.notificationLog.create({
            data: {
              schoolId,
              channel: "EMAIL",
              email: r.email,
              recipientName: r.name || null,
              message: r.message,
              subject,
              type,
              template: templateKey || null,
              status: result?.skipped ? "FAILED" : "SENT",
              messageId: result?.messageId || null,
              errorMessage: result?.skipped
                ? "Email not sent — no provider"
                : null,
              sentById: staffId,
            },
          });

          if (result?.skipped) failed++;
          else emailSent++;
        } catch (err) {
          failed++;
          errors.push(`Email ${r.email}: ${err.message}`);

          try {
            await prisma.notificationLog.create({
              data: {
                schoolId,
                channel: "EMAIL",
                email: r.email,
                recipientName: r.name || null,
                message: r.message,
                subject: r.subject || `${schoolName} — Notification`,
                type,
                template: templateKey || null,
                status: "FAILED",
                errorMessage: err.message?.slice(0, 500) || "Unknown error",
                sentById: staffId,
              },
            });
          } catch {
            /* swallow logging errors */
          }
        }
      }),
    );
  }

  return {
    smsSent,
    emailSent,
    failed,
    total: recipients.length,
    errors: errors.slice(0, 5),
  };
};

module.exports = { sendNotifications };
