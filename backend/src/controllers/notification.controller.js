// backend/src/controllers/notification.controller.js
const prisma = require("../config/db");

// ==================== LIST ====================
// GET /api/platform/notifications?status=UNREAD,READ
const listNotifications = async (req, res) => {
  try {
    const { status, limit = "20" } = req.query;

    const where = { platformId: req.platformId };
    if (status) {
      const statuses = String(status)
        .split(",")
        .map((s) => s.trim());
      where.status = { in: statuses };
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Math.min(parseInt(limit, 10) || 20, 100),
      include: {
        school: { select: { id: true, name: true } },
      },
    });

    return res.json({ success: true, data: notifications });
  } catch (err) {
    console.error("listNotifications error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load notifications" });
  }
};

// ==================== UNREAD COUNT ====================
// GET /api/platform/notifications/unread-count
const getUnreadCount = async (req, res) => {
  try {
    const count = await prisma.notification.count({
      where: { platformId: req.platformId, status: "UNREAD" },
    });
    return res.json({ success: true, data: { count } });
  } catch (err) {
    console.error("getUnreadCount error:", err);
    return res.status(500).json({ success: false, message: "Failed" });
  }
};

// ==================== MARK ONE READ ====================
// POST /api/platform/notifications/:id/read
const markRead = async (req, res) => {
  try {
    const n = await prisma.notification.findFirst({
      where: { id: req.params.id, platformId: req.platformId },
    });
    if (!n) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }
    if (n.status === "UNREAD") {
      await prisma.notification.update({
        where: { id: n.id },
        data: { status: "READ" },
      });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error("markRead error:", err);
    return res.status(500).json({ success: false, message: "Failed" });
  }
};

// ==================== MARK ALL READ ====================
// POST /api/platform/notifications/mark-all-read
const markAllRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { platformId: req.platformId, status: "UNREAD" },
      data: { status: "READ" },
    });
    return res.json({ success: true });
  } catch (err) {
    console.error("markAllRead error:", err);
    return res.status(500).json({ success: false, message: "Failed" });
  }
};

// ==================== RESOLVE ====================
// POST /api/platform/notifications/:id/resolve
// Body: { action: "approve" | "reject", note?: string }
// Currently handles SETTLEMENT_CHANGE_REQUEST.
// On approve → applies the payload to the school's settlement fields.
// On reject → school just sees the pending request disappear.
const resolveNotification = async (req, res) => {
  try {
    const { action, note } = req.body;
    if (!["approve", "reject"].includes(action)) {
      return res
        .status(400)
        .json({ success: false, message: "action must be approve or reject" });
    }

    const n = await prisma.notification.findFirst({
      where: { id: req.params.id, platformId: req.platformId },
    });
    if (!n) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }
    if (n.status === "RESOLVED") {
      return res
        .status(400)
        .json({ success: false, message: "Already resolved" });
    }

    if (n.type === "SETTLEMENT_CHANGE_REQUEST") {
      const p = n.payload || {};

      if (action === "approve") {
        if (!n.schoolId) {
          return res
            .status(400)
            .json({ success: false, message: "Notification has no school" });
        }

        await prisma.school.update({
          where: { id: n.schoolId },
          data: {
            settlementBankName: p.bankName || null,
            settlementAccountName: p.accountName || null,
            settlementAccountNumber: p.accountNumber || null,
            settlementBranch: p.branch || null,
          },
        });

        await prisma.auditLog.create({
          data: {
            schoolId: n.schoolId,
            staffId: null,
            action: "SETTLEMENT_CHANGE_APPROVED",
            entity: "School",
            entityId: n.schoolId,
            actorName: req.platformAdmin.fullName,
            actorRole: "PLATFORM_OWNER",
            actorEmail: req.platformAdmin.email,
            changes: {
              approved: true,
              note: note || null,
              newAccountNumber: p.accountNumber,
            },
          },
        });
      } else {
        // reject — log only
        if (n.schoolId) {
          await prisma.auditLog.create({
            data: {
              schoolId: n.schoolId,
              staffId: null,
              action: "SETTLEMENT_CHANGE_REJECTED",
              entity: "School",
              entityId: n.schoolId,
              actorName: req.platformAdmin.fullName,
              actorRole: "PLATFORM_OWNER",
              actorEmail: req.platformAdmin.email,
              changes: { rejected: true, note: note || null },
            },
          });
        }
      }
    }

    await prisma.notification.update({
      where: { id: n.id },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
        resolvedById: req.platformAdmin.id,
        message:
          action === "approve"
            ? `${n.message} — Approved${note ? `: ${note}` : ""}`
            : `${n.message} — Rejected${note ? `: ${note}` : ""}`,
      },
    });

    return res.json({
      success: true,
      message: action === "approve" ? "Approved" : "Rejected",
    });
  } catch (err) {
    console.error("resolveNotification error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to resolve" });
  }
};

module.exports = {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  resolveNotification,
};
