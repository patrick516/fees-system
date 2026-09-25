const prisma = require("../config/db");
const { sendSMS } = require("../lib/sms");

// ==================== BULK SMS ====================
// POST /api/sms/bulk
// Body: { type: "reminder" | "unpaid" | "announcement", message?, term? }
// Groups recipients by parent phone so a parent with multiple children
// gets ONE message listing all their children — not one per student.
const sendBulkSMS = async (req, res) => {
  try {
    const { type, message } = req.body;

    if (!type || !["reminder", "unpaid", "announcement"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "type must be reminder, unpaid, or announcement",
      });
    }

    if (type === "announcement" && (!message || !message.trim())) {
      return res.status(400).json({
        success: false,
        message: "message is required for announcements",
      });
    }

    // Pull the school + active term — single source of truth
    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: {
        name: true,
        activeTerm: true,
        activeAcademicYear: true,
      },
    });

    if (!school) {
      return res
        .status(404)
        .json({ success: false, message: "School not found" });
    }

    // For reminder/unpaid we NEED an active term
    if (
      type !== "announcement" &&
      (!school.activeTerm || !school.activeAcademicYear)
    ) {
      return res.status(400).json({
        success: false,
        message: "No active term set. Please activate a term first.",
      });
    }

    const termToUse = school.activeTerm;
    const yearToUse = school.activeAcademicYear;
    const termLabel = termToUse ? termToUse.replace("_", " ") : "";

    // ==================== ANNOUNCEMENT ====================
    // Group by phone, no per-student info needed since message is custom
    if (type === "announcement") {
      const students = await prisma.student.findMany({
        where: { schoolId: req.schoolId, isActive: true },
        select: { parentPhone: true, parentPhone2: true },
      });

      const body = message.trim();
      const seen = new Set();
      const recipients = [];

      for (const s of students) {
        const phone = s.parentPhone?.trim();
        if (phone && !seen.has(phone)) {
          seen.add(phone);
          recipients.push({ phone, message: body });
        }
      }

      return sendToRecipients({
        recipients,
        schoolId: req.schoolId,
        type,
        staffId: req.staff?.id,
        res,
      });
    }

    // ==================== REMINDER / UNPAID ====================
    // 1. Load students + their class fee structures
    const students = await prisma.student.findMany({
      where: { schoolId: req.schoolId, isActive: true },
      include: {
        class: {
          include: {
            feeStructures: {
              where: {
                term: termToUse,
                academicYear: yearToUse,
                isActive: true,
              },
            },
          },
        },
      },
    });

    // 2. Batch-load all verified payments for this term/year in ONE query
    const paymentGroups = await prisma.feePayment.groupBy({
      by: ["studentId"],
      where: {
        schoolId: req.schoolId,
        term: termToUse,
        academicYear: yearToUse,
        status: "VERIFIED",
      },
      _sum: { amount: true },
    });
    const paidByStudent = Object.fromEntries(
      paymentGroups.map((p) => [p.studentId, p._sum.amount || 0]),
    );

    // 3. Group qualifying students by parent phone
    //    phoneMap: phone -> { parentName, children: [{ name, required, paid, balance }] }
    const phoneMap = new Map();

    for (const student of students) {
      const feeStructure = student.class.feeStructures[0];
      if (!feeStructure) continue; // class has no fee structure this term
      const phone = student.parentPhone?.trim();
      if (!phone) continue;

      const paid = paidByStudent[student.id] || 0;
      const required = feeStructure.totalAmount;
      const balance = Math.max(0, required - paid);

      // Filter by type
      if (type === "reminder" && balance === 0) continue;
      if (type === "unpaid" && paid > 0) continue;

      if (!phoneMap.has(phone)) {
        phoneMap.set(phone, {
          phone,
          parentName: student.parentName,
          children: [],
        });
      }
      phoneMap.get(phone).children.push({
        name: student.fullName,
        required,
        paid,
        balance,
      });
    }

    // 4. Build one message per phone
    const recipients = [];

    for (const entry of phoneMap.values()) {
      const { phone, parentName, children } = entry;

      if (type === "reminder") {
        if (children.length === 1) {
          const c = children[0];
          recipients.push({
            phone,
            message:
              `Dear ${parentName}, ${c.name}'s ${termLabel} ${yearToUse} fees have a balance of MWK ${c.balance.toLocaleString()}. ` +
              `Please pay at your earliest convenience. — ${school.name}`,
          });
        } else {
          const totalBalance = children.reduce((s, c) => s + c.balance, 0);
          const listing = children
            .map((c) => `${c.name} MWK ${c.balance.toLocaleString()}`)
            .join(", ");
          recipients.push({
            phone,
            message:
              `Dear ${parentName}, ${termLabel} ${yearToUse} fee balances: ${listing}. ` +
              `Total MWK ${totalBalance.toLocaleString()}. Please pay soon. — ${school.name}`,
          });
        }
      } else if (type === "unpaid") {
        if (children.length === 1) {
          const c = children[0];
          recipients.push({
            phone,
            message:
              `Dear ${parentName}, we have no payment on record for ${c.name}'s ${termLabel} ${yearToUse} fees (MWK ${c.required.toLocaleString()}). ` +
              `Please pay to avoid disruption. — ${school.name}`,
          });
        } else {
          const names = children.map((c) => c.name).join(", ");
          const totalRequired = children.reduce((s, c) => s + c.required, 0);
          recipients.push({
            phone,
            message:
              `Dear ${parentName}, we have no payment on record for ${children.length} of your children: ${names}. ` +
              `Total due: MWK ${totalRequired.toLocaleString()} for ${termLabel} ${yearToUse}. Please pay soon. — ${school.name}`,
          });
        }
      }
    }

    return sendToRecipients({
      recipients,
      schoolId: req.schoolId,
      type,
      staffId: req.staff?.id,
      res,
    });
  } catch (err) {
    console.error("Bulk SMS error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to send SMS",
    });
  }
};

// ==================== SHARED SENDER ====================
// Sends recipients in batches of 10 in parallel, logs each to SmsLog
async function sendToRecipients({ recipients, schoolId, type, staffId, res }) {
  if (recipients.length === 0) {
    return res.json({
      success: true,
      message: "No matching recipients found",
      data: { sent: 0, failed: 0, total: 0 },
    });
  }

  let sent = 0;
  let failed = 0;
  const errors = [];
  const BATCH_SIZE = 10;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (r) => {
        try {
          const result = await sendSMS(r.phone, r.message);

          await prisma.smsLog.create({
            data: {
              schoolId,
              phone: r.phone,
              message: r.message,
              type,
              status: "SENT",
              messageId: result?.messageId || null,
              cost: result?.cost != null ? String(result.cost) : null,
              sentById: staffId || null,
            },
          });

          sent++;
        } catch (err) {
          failed++;
          errors.push(`${r.phone}: ${err.message}`);

          try {
            await prisma.smsLog.create({
              data: {
                schoolId,
                phone: r.phone,
                message: r.message,
                type,
                status: "FAILED",
                errorMessage: err.message?.slice(0, 500) || "Unknown error",
                sentById: staffId || null,
              },
            });
          } catch {
            /* don't let log failure kill the send loop */
          }
        }
      }),
    );
  }

  return res.json({
    success: true,
    message: `Sent ${sent} message${sent !== 1 ? "s" : ""}${failed ? `, ${failed} failed` : ""}`,
    data: {
      sent,
      failed,
      total: recipients.length,
      errors: errors.slice(0, 5),
    },
  });
}

// ==================== LOGS ====================
// GET /api/sms/logs?type=&limit=
const getSmsLogs = async (req, res) => {
  try {
    const { type, limit = 50 } = req.query;
    const where = { schoolId: req.schoolId };
    if (type) where.type = type;

    const logs = await prisma.smsLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
      include: {
        sentBy: { select: { fullName: true } },
      },
    });

    res.json({ success: true, data: logs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to get SMS logs" });
  }
};

module.exports = { sendBulkSMS, getSmsLogs };
