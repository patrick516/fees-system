const prisma = require("../config/db");

const listLogs = async (req, res) => {
  try {
    const {
      from,
      to,
      staffId,
      action,
      status,
      search,
      page = 1,
      limit = 25,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 25));
    const skip = (pageNum - 1) * limitNum;

    const where = { schoolId: req.schoolId };

    if (staffId) where.staffId = staffId;
    if (status) where.status = status;

    if (action) {
      // Support multiple actions: "LOGIN_SUCCESS,LOGIN_FAILED"
      const actions = String(action)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (actions.length === 1) where.action = actions[0];
      else if (actions.length > 1) where.action = { in: actions };
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) {
        // Include the whole end day
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (search) {
      where.OR = [
        { actorName: { contains: search, mode: "insensitive" } },
        { actorEmail: { contains: search, mode: "insensitive" } },
        { action: { contains: search, mode: "insensitive" } },
        { entity: { contains: search, mode: "insensitive" } },
        { targetName: { contains: search, mode: "insensitive" } },
        { ipAddress: { contains: search } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return res.json({
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
    console.error("List audit logs error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load audit logs" });
  }
};

//  FILTER METADATA
// GET /api/audit/meta
// Returns the list of distinct actions + staff for filter dropdowns
const getMeta = async (req, res) => {
  try {
    const [actionGroups, staff] = await Promise.all([
      prisma.auditLog.groupBy({
        by: ["action"],
        where: { schoolId: req.schoolId },
        _count: { _all: true },
        orderBy: { _count: { action: "desc" } },
      }),
      prisma.staff.findMany({
        where: { schoolId: req.schoolId },
        select: { id: true, fullName: true, role: { select: { name: true } } },
        orderBy: { fullName: "asc" },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        actions: actionGroups.map((a) => ({
          action: a.action,
          count: a._count._all,
        })),
        staff,
      },
    });
  } catch (err) {
    console.error("Audit meta error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load filters" });
  }
};

//  EXPORT CSV
// GET /api/audit/export?from=&to=&action=&status=
const exportCsv = async (req, res) => {
  try {
    const { from, to, staffId, action, status } = req.query;
    const where = { schoolId: req.schoolId };

    if (staffId) where.staffId = staffId;
    if (status) where.status = status;
    if (action) where.action = action;

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 10000, // hard cap
    });

    const escape = (v) => {
      if (v === null || v === undefined) return "";
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };

    const header = [
      "Timestamp",
      "Actor Name",
      "Actor Role",
      "Actor Email",
      "Action",
      "Entity",
      "Target",
      "Status",
      "IP Address",
      "User Agent",
      "Changes",
    ].join(",");

    const rows = logs.map((l) =>
      [
        l.createdAt.toISOString(),
        l.actorName,
        l.actorRole,
        l.actorEmail,
        l.action,
        l.entity,
        l.targetName,
        l.status,
        l.ipAddress,
        l.userAgent,
        l.changes ? JSON.stringify(l.changes) : "",
      ]
        .map(escape)
        .join(","),
    );

    const csv = [header, ...rows].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="audit-trail-${Date.now()}.csv"`,
    );
    return res.send(csv);
  } catch (err) {
    console.error("Export audit CSV error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to export" });
  }
};

//  SINGLE LOG DETAIL
// GET /api/audit/:id
const getLog = async (req, res) => {
  try {
    const log = await prisma.auditLog.findFirst({
      where: { id: req.params.id, schoolId: req.schoolId },
    });
    if (!log)
      return res
        .status(404)
        .json({ success: false, message: "Log entry not found" });
    return res.json({ success: true, data: log });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to load entry" });
  }
};

// ==================== GROUP BY USER ====================
// GET /api/audit/grouped?from=&to=&search=
// Returns one row per unique actor with aggregate stats
const getGroupedByUser = async (req, res) => {
  try {
    const { from, to, search } = req.query;

    const where = { schoolId: req.schoolId };

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (search) {
      where.OR = [
        { actorName: { contains: search, mode: "insensitive" } },
        { actorEmail: { contains: search, mode: "insensitive" } },
        { actorRole: { contains: search, mode: "insensitive" } },
      ];
    }

    // Pull all matching logs (with a reasonable cap)
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 5000,
      select: {
        staffId: true,
        actorName: true,
        actorRole: true,
        actorEmail: true,
        action: true,
        status: true,
        createdAt: true,
      },
    });

    // Group in memory
    const groups = new Map();

    for (const log of logs) {
      const key = log.staffId || log.actorEmail || "system";

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          staffId: log.staffId,
          actorName: log.actorName || "System",
          actorRole: log.actorRole || "—",
          actorEmail: log.actorEmail || null,
          totalActions: 0,
          failedActions: 0,
          firstActionAt: log.createdAt,
          lastActionAt: log.createdAt,
          actions: {},
        });
      }

      const g = groups.get(key);
      g.totalActions++;
      if (log.status === "FAILED") g.failedActions++;

      // Track min/max dates
      if (log.createdAt > g.lastActionAt) g.lastActionAt = log.createdAt;
      if (log.createdAt < g.firstActionAt) g.firstActionAt = log.createdAt;

      // Track per-action counts
      g.actions[log.action] = (g.actions[log.action] || 0) + 1;
    }

    // Convert to array + sort by last activity desc
    const result = Array.from(groups.values())
      .map((g) => {
        // Convert action counts to top 4 for display
        const topActions = Object.entries(g.actions)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([action, count]) => ({ action, count }));

        return {
          ...g,
          topActions,
          actionCount: Object.keys(g.actions).length,
        };
      })
      .sort((a, b) => new Date(b.lastActionAt) - new Date(a.lastActionAt));

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error("Grouped audit error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to group audit logs" });
  }
};

// ==================== USER TIMELINE ====================
// GET /api/audit/user/:staffId?page=1&limit=50
const getUserTimeline = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { from, to, page = 1, limit = 50 } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where = { schoolId: req.schoolId };

    // staffId can be "system" or an actual UUID
    if (staffId === "system") {
      where.staffId = null;
    } else {
      where.staffId = staffId;
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return res.json({
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
    console.error("User timeline error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load user timeline" });
  }
};

module.exports = {
  listLogs,
  getMeta,
  exportCsv,
  getLog,
  getGroupedByUser,
  getUserTimeline,
};
