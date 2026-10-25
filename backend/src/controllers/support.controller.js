const prisma = require("../config/db");
const { sendSMS } = require("../lib/sms");
const { sendSupportReplyEmail } = require("../lib/mailer");

const PARENT_PORTAL_URL =
  process.env.PARENT_PORTAL_URL || "https://fees-system-8z3u.vercel.app";

// ==================== PARENT SIDE ====================

// GET /api/parent/support
const listParentTickets = async (req, res) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: {
        schoolId: req.student.schoolId,
        ticketType: "SCHOOL_SUPPORT",
        creatorId: req.student.id,
      },
      include: { _count: { select: { messages: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return res.json({ success: true, data: tickets });
  } catch (err) {
    console.error("listParentTickets error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load tickets" });
  }
};

// POST /api/parent/support
const createParentTicket = async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) {
      return res
        .status(400)
        .json({ success: false, message: "Subject and message are required" });
    }

    const parentName = req.student.parentName || req.student.fullName;
    const parentPhone = req.parentPhone || req.student.parentPhone;

    const ticket = await prisma.supportTicket.create({
      data: {
        schoolId: req.student.schoolId,
        ticketType: "SCHOOL_SUPPORT",
        creatorType: "PARENT",
        creatorId: req.student.id,
        creatorName: req.student.fullName, // student identity (so admin knows which child)
        creatorPhone: parentPhone,
        subject: subject.trim(),
        lastReplyBy: "CREATOR",
        lastReplyAt: new Date(),
        messages: {
          create: [
            {
              senderType: "CREATOR",
              senderName: parentName,
              message: message.trim(),
            },
          ],
        },
      },
      include: { messages: true },
    });

    return res.status(201).json({ success: true, data: ticket });
  } catch (err) {
    console.error("createParentTicket error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create ticket" });
  }
};

// GET /api/parent/support/:id
const getParentTicket = async (req, res) => {
  try {
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: req.params.id,
        schoolId: req.student.schoolId,
        creatorId: req.student.id,
        ticketType: "SCHOOL_SUPPORT",
      },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!ticket)
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });

    await prisma.supportMessage.updateMany({
      where: { ticketId: ticket.id, senderType: "RESPONDER", isRead: false },
      data: { isRead: true },
    });

    return res.json({ success: true, data: ticket });
  } catch (err) {
    console.error("getParentTicket error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load ticket" });
  }
};

// POST /api/parent/support/:id/reply
const replyAsParent = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message)
      return res
        .status(400)
        .json({ success: false, message: "Message required" });

    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: req.params.id,
        schoolId: req.student.schoolId,
        creatorId: req.student.id,
        status: "OPEN",
      },
    });
    if (!ticket)
      return res
        .status(404)
        .json({
          success: false,
          message: "Ticket not found or already closed",
        });

    const parentName = req.student.parentName || req.student.fullName;

    await prisma.$transaction([
      prisma.supportMessage.create({
        data: {
          ticketId: ticket.id,
          senderType: "CREATOR",
          senderName: parentName,
          message: message.trim(),
        },
      }),
      prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { lastReplyBy: "CREATOR", lastReplyAt: new Date() },
      }),
    ]);

    return res.json({ success: true, message: "Reply sent" });
  } catch (err) {
    console.error("replyAsParent error:", err);
    return res.status(500).json({ success: false, message: "Failed to reply" });
  }
};

// GET /api/parent/support/unread-count
const getParentUnreadCount = async (req, res) => {
  try {
    const count = await prisma.supportTicket.count({
      where: {
        schoolId: req.student.schoolId,
        ticketType: "SCHOOL_SUPPORT",
        creatorId: req.student.id,
        status: "OPEN",
        lastReplyBy: "RESPONDER",
      },
    });
    return res.json({ success: true, data: { count } });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed" });
  }
};

// ==================== SCHOOL ADMIN SIDE ====================

// GET /api/support
const listSchoolTickets = async (req, res) => {
  try {
    const { status } = req.query;
    const where = { schoolId: req.schoolId, ticketType: "SCHOOL_SUPPORT" };
    if (status) where.status = status;

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: { _count: { select: { messages: true } } },
      orderBy: [{ status: "asc" }, { lastReplyAt: "desc" }],
    });
    return res.json({ success: true, data: tickets });
  } catch (err) {
    console.error("listSchoolTickets error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load tickets" });
  }
};

// GET /api/support/unread-count
const getSchoolUnreadCount = async (req, res) => {
  try {
    const count = await prisma.supportTicket.count({
      where: {
        schoolId: req.schoolId,
        ticketType: "SCHOOL_SUPPORT",
        status: "OPEN",
        lastReplyBy: "CREATOR",
      },
    });
    return res.json({ success: true, data: { count } });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed" });
  }
};

// GET /api/support/:id
const getSchoolTicket = async (req, res) => {
  try {
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: req.params.id,
        schoolId: req.schoolId,
        ticketType: "SCHOOL_SUPPORT",
      },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!ticket)
      return res.status(404).json({ success: false, message: "Not found" });

    await prisma.supportMessage.updateMany({
      where: { ticketId: ticket.id, senderType: "CREATOR", isRead: false },
      data: { isRead: true },
    });

    return res.json({ success: true, data: ticket });
  } catch (err) {
    console.error("getSchoolTicket error:", err);
    return res.status(500).json({ success: false, message: "Failed" });
  }
};

// POST /api/support/:id/reply  (sends SMS to parent)
const replyAsAdmin = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message)
      return res
        .status(400)
        .json({ success: false, message: "Message required" });

    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: req.params.id,
        schoolId: req.schoolId,
        ticketType: "SCHOOL_SUPPORT",
        status: "OPEN",
      },
    });
    if (!ticket)
      return res
        .status(404)
        .json({ success: false, message: "Not found or closed" });

    await prisma.$transaction([
      prisma.supportMessage.create({
        data: {
          ticketId: ticket.id,
          senderType: "RESPONDER",
          senderName: req.staff.fullName,
          message: message.trim(),
        },
      }),
      prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { lastReplyBy: "RESPONDER", lastReplyAt: new Date() },
      }),
    ]);

    // Send SMS to parent
    if (ticket.creatorPhone) {
      const sms = `Hello, your question about ${ticket.creatorName} has been answered. Login to view: ${PARENT_PORTAL_URL}/login`;
      sendSMS(ticket.creatorPhone, sms).catch((e) =>
        console.error("Support SMS send failed:", e.message),
      );
    }

    return res.json({
      success: true,
      message: "Reply sent. Parent notified by SMS.",
    });
  } catch (err) {
    console.error("replyAsAdmin error:", err);
    return res.status(500).json({ success: false, message: "Failed to reply" });
  }
};

// POST /api/support/:id/close
const closeAsAdmin = async (req, res) => {
  try {
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: req.params.id,
        schoolId: req.schoolId,
        ticketType: "SCHOOL_SUPPORT",
      },
    });
    if (!ticket)
      return res.status(404).json({ success: false, message: "Not found" });
    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: "CLOSED" },
    });
    return res.json({ success: true, message: "Ticket closed" });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to close" });
  }
};

// ==================== ADMIN → PLATFORM SUPPORT ====================

// POST /api/support/platform  (admin creates a ticket to SchoolPay)
const createPlatformTicket = async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) {
      return res
        .status(400)
        .json({ success: false, message: "Subject and message required" });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        schoolId: req.schoolId,
        ticketType: "PLATFORM_SUPPORT",
        creatorType: "STAFF",
        creatorId: req.staff.id,
        creatorName: req.staff.fullName,
        creatorEmail: req.staff.email,
        subject: subject.trim(),
        lastReplyBy: "CREATOR",
        lastReplyAt: new Date(),
        messages: {
          create: [
            {
              senderType: "CREATOR",
              senderName: req.staff.fullName,
              message: message.trim(),
            },
          ],
        },
      },
      include: { messages: true },
    });

    return res.status(201).json({ success: true, data: ticket });
  } catch (err) {
    console.error("createPlatformTicket error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create ticket" });
  }
};

// GET /api/support/platform  (my tickets to SchoolPay)
const listMyPlatformTickets = async (req, res) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { schoolId: req.schoolId, ticketType: "PLATFORM_SUPPORT" },
      include: { _count: { select: { messages: true } } },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    });
    return res.json({ success: true, data: tickets });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to load tickets" });
  }
};

// GET /api/support/platform/:id  (view + mark read)
const getMyPlatformTicket = async (req, res) => {
  try {
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: req.params.id,
        schoolId: req.schoolId,
        ticketType: "PLATFORM_SUPPORT",
      },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!ticket)
      return res.status(404).json({ success: false, message: "Not found" });

    await prisma.supportMessage.updateMany({
      where: { ticketId: ticket.id, senderType: "RESPONDER", isRead: false },
      data: { isRead: true },
    });

    return res.json({ success: true, data: ticket });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed" });
  }
};

// POST /api/support/platform/:id/reply  (admin replies to SchoolPay)
const replyToPlatform = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message)
      return res
        .status(400)
        .json({ success: false, message: "Message required" });

    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: req.params.id,
        schoolId: req.schoolId,
        ticketType: "PLATFORM_SUPPORT",
        status: "OPEN",
      },
    });
    if (!ticket)
      return res
        .status(404)
        .json({ success: false, message: "Not found or closed" });

    await prisma.$transaction([
      prisma.supportMessage.create({
        data: {
          ticketId: ticket.id,
          senderType: "CREATOR",
          senderName: req.staff.fullName,
          message: message.trim(),
        },
      }),
      prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { lastReplyBy: "CREATOR", lastReplyAt: new Date() },
      }),
    ]);

    return res.json({ success: true, message: "Reply sent" });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed" });
  }
};

// ==================== PLATFORM OWNER SIDE ====================

// GET /api/platform/support
const listPlatformTickets = async (req, res) => {
  try {
    const { status } = req.query;
    const where = { ticketType: "PLATFORM_SUPPORT" };
    if (status) where.status = status;

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        school: { select: { id: true, name: true } },
        _count: { select: { messages: true } },
      },
      orderBy: [{ status: "asc" }, { lastReplyAt: "desc" }],
    });
    return res.json({ success: true, data: tickets });
  } catch (err) {
    console.error("listPlatformTickets error:", err);
    return res.status(500).json({ success: false, message: "Failed" });
  }
};

// GET /api/platform/support/unread-count
const getPlatformUnreadCount = async (req, res) => {
  try {
    const count = await prisma.supportTicket.count({
      where: {
        ticketType: "PLATFORM_SUPPORT",
        status: "OPEN",
        lastReplyBy: "CREATOR",
      },
    });
    return res.json({ success: true, data: { count } });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed" });
  }
};

// GET /api/platform/support/:id
const getPlatformTicket = async (req, res) => {
  try {
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: req.params.id, ticketType: "PLATFORM_SUPPORT" },
      include: {
        school: { select: { id: true, name: true } },
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!ticket)
      return res.status(404).json({ success: false, message: "Not found" });

    await prisma.supportMessage.updateMany({
      where: { ticketId: ticket.id, senderType: "CREATOR", isRead: false },
      data: { isRead: true },
    });

    return res.json({ success: true, data: ticket });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed" });
  }
};

// POST /api/platform/support/:id/reply  (sends email to admin)
const replyAsPlatform = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message)
      return res
        .status(400)
        .json({ success: false, message: "Message required" });

    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: req.params.id,
        ticketType: "PLATFORM_SUPPORT",
        status: "OPEN",
      },
      include: { school: { select: { name: true } } },
    });
    if (!ticket)
      return res
        .status(404)
        .json({ success: false, message: "Not found or closed" });

    await prisma.$transaction([
      prisma.supportMessage.create({
        data: {
          ticketId: ticket.id,
          senderType: "RESPONDER",
          senderName: req.platformAdmin.fullName,
          message: message.trim(),
        },
      }),
      prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { lastReplyBy: "RESPONDER", lastReplyAt: new Date() },
      }),
    ]);

    // Send email to admin
    if (ticket.creatorEmail) {
      sendSupportReplyEmail({
        to: ticket.creatorEmail,
        name: ticket.creatorName,
        schoolName: ticket.school?.name || "your school",
        subject: ticket.subject,
        replyPreview: message.trim(),
      }).catch((e) => console.error("Support email failed:", e.message));
    }

    return res.json({
      success: true,
      message: "Reply sent. Admin notified by email.",
    });
  } catch (err) {
    console.error("replyAsPlatform error:", err);
    return res.status(500).json({ success: false, message: "Failed to reply" });
  }
};

// POST /api/platform/support/:id/close
const closeAsPlatform = async (req, res) => {
  try {
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: req.params.id, ticketType: "PLATFORM_SUPPORT" },
    });
    if (!ticket)
      return res.status(404).json({ success: false, message: "Not found" });
    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: "CLOSED" },
    });
    return res.json({ success: true, message: "Ticket closed" });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed" });
  }
};

module.exports = {
  // Parent
  listParentTickets,
  createParentTicket,
  getParentTicket,
  replyAsParent,
  getParentUnreadCount,
  // School admin
  listSchoolTickets,
  getSchoolUnreadCount,
  getSchoolTicket,
  replyAsAdmin,
  closeAsAdmin,
  createPlatformTicket,
  listMyPlatformTickets,
  getMyPlatformTicket,
  replyToPlatform,
  // Platform owner
  listPlatformTickets,
  getPlatformUnreadCount,
  getPlatformTicket,
  replyAsPlatform,
  closeAsPlatform,
};
