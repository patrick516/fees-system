// backend/src/controllers/sms.controller.js
const prisma = require("../config/db");
const { sendNotifications } = require("../lib/notifier");

// ==================== HELPER: Resolve the default channel ====================
const resolveChannel = (requested, school) => {
  if (requested && ["SMS", "EMAIL", "BOTH"].includes(requested.toUpperCase())) {
    return requested.toUpperCase();
  }
  return school?.notificationDefaults?.defaultChannel || "BOTH";
};

// ==================== BULK SEND ====================
// POST /api/sms/bulk
// Body: { type, message?, term?, channel? }
const sendBulkSMS = async (req, res) => {
  try {
    const { type, message, channel: requestedChannel } = req.body;

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

    // Load school + preferences
    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: {
        name: true,
        activeTerm: true,
        activeAcademicYear: true,
        notificationDefaults: true,
      },
    });

    if (!school) {
      return res
        .status(404)
        .json({ success: false, message: "School not found" });
    }

    const channel = resolveChannel(requestedChannel, school);

    // Reminder / unpaid need an active term
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
    if (type === "announcement") {
      const students = await prisma.student.findMany({
        where: { schoolId: req.schoolId, isActive: true },
        select: {
          parentPhone: true,
          parentPhone2: true,
          parentEmail: true,
          parentName: true,
        },
      });

      const body = message.trim();
      const seen = new Set();
      const recipients = [];

      for (const s of students) {
        const phone = s.parentPhone?.trim();
        const email = s.parentEmail?.trim();
        const key = `${phone || ""}|${email || ""}`;
        if ((!phone && !email) || seen.has(key)) continue;
        seen.add(key);
        recipients.push({
          phone,
          email,
          name: s.parentName,
          message: body,
          subject: `Announcement from ${school.name}`,
        });
      }

      const result = await sendNotifications({
        recipients,
        channel,
        type,
        templateKey: "announcement",
        schoolId: req.schoolId,
        staffId: req.staff?.id,
        schoolName: school.name,
      });

      return respond(res, result);
    }

    // ==================== REMINDER / UNPAID ====================
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

    // Group by (phone + email) so siblings share one message
    const contactMap = new Map();

    for (const student of students) {
      const feeStructure = student.class.feeStructures[0];
      if (!feeStructure) continue;

      const phone = student.parentPhone?.trim();
      const email = student.parentEmail?.trim();
      if (!phone && !email) continue;

      const paid = paidByStudent[student.id] || 0;
      const required = feeStructure.totalAmount;
      const balance = Math.max(0, required - paid);

      if (type === "reminder" && balance === 0) continue;
      if (type === "unpaid" && paid > 0) continue;

      // Key by email when available (more unique), else phone
      const key = email || phone;

      if (!contactMap.has(key)) {
        contactMap.set(key, {
          phone,
          email,
          name: student.parentName,
          children: [],
        });
      }
      contactMap.get(key).children.push({
        name: student.fullName,
        required,
        paid,
        balance,
      });
    }

    const recipients = [];

    for (const entry of contactMap.values()) {
      const { phone, email, name, children } = entry;

      let msg = "";
      if (type === "reminder") {
        if (children.length === 1) {
          const c = children[0];
          msg =
            `Dear ${name}, ${c.name}'s ${termLabel} ${yearToUse} fees have a balance of MWK ${c.balance.toLocaleString()}. ` +
            `Please pay at your earliest convenience. — ${school.name}`;
        } else {
          const total = children.reduce((s, c) => s + c.balance, 0);
          const listing = children
            .map((c) => `${c.name} MWK ${c.balance.toLocaleString()}`)
            .join(", ");
          msg =
            `Dear ${name}, ${termLabel} ${yearToUse} fee balances: ${listing}. ` +
            `Total MWK ${total.toLocaleString()}. Please pay soon. — ${school.name}`;
        }
      } else if (type === "unpaid") {
        if (children.length === 1) {
          const c = children[0];
          msg =
            `Dear ${name}, we have no payment on record for ${c.name}'s ${termLabel} ${yearToUse} fees (MWK ${c.required.toLocaleString()}). ` +
            `Please pay to avoid disruption. — ${school.name}`;
        } else {
          const names = children.map((c) => c.name).join(", ");
          const total = children.reduce((s, c) => s + c.required, 0);
          msg =
            `Dear ${name}, we have no payment on record for ${children.length} of your children: ${names}. ` +
            `Total due: MWK ${total.toLocaleString()} for ${termLabel} ${yearToUse}. Please pay soon. — ${school.name}`;
        }
      }

      recipients.push({
        phone,
        email,
        name,
        message: msg,
        subject:
          type === "reminder"
            ? `Fee Reminder — ${school.name}`
            : `Unpaid Fees — ${school.name}`,
      });
    }

    const result = await sendNotifications({
      recipients,
      channel,
      type,
      templateKey: type === "reminder" ? "fee_reminder" : "unpaid",
      schoolId: req.schoolId,
      staffId: req.staff?.id,
      schoolName: school.name,
    });

    return respond(res, result);
  } catch (err) {
    console.error("Bulk send error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to send notifications",
    });
  }
};

const respond = (res, result) => {
  const parts = [];
  if (result.smsSent > 0) parts.push(`${result.smsSent} SMS`);
  if (result.emailSent > 0)
    parts.push(`${result.emailSent} email${result.emailSent !== 1 ? "s" : ""}`);

  const msg =
    result.smsSent + result.emailSent === 0
      ? "No notifications sent"
      : `Sent ${parts.join(" + ")}${result.failed ? `, ${result.failed} failed` : ""}`;

  return res.json({
    success: true,
    message: msg,
    data: result,
  });
};

// ==================== LOGS ====================
// GET /api/sms/logs?channel=&type=&status=&page=1&limit=20
const getSmsLogs = async (req, res) => {
  try {
    const { type, status, channel, page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = { schoolId: req.schoolId };
    if (type) where.type = type;
    if (status) where.status = status;
    if (channel) where.channel = channel;

    const [logs, total] = await Promise.all([
      prisma.notificationLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
        include: { sentBy: { select: { fullName: true } } },
      }),
      prisma.notificationLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to get notification logs" });
  }
};

module.exports = { sendBulkSMS, getSmsLogs };
