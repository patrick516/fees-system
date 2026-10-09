// backend/src/lib/audit.js
const prisma = require("../config/db");

/**
 * Write an audit log entry. Never throws — audit failures must not break
 * the calling request.
 *
 * @param {Object} req      - Express request (for IP, UA, schoolId, staff)
 * @param {Object} payload
 * @param {string} payload.action     - e.g. "STUDENT_ADDED", "LOGIN_SUCCESS"
 * @param {string} payload.entity     - "Student", "Payment", "Session", ...
 * @param {string} [payload.entityId]
 * @param {string} [payload.targetName] - human-readable, e.g. student full name
 * @param {Object} [payload.changes]  - before/after or full payload
 * @param {string} [payload.status]   - "SUCCESS" | "FAILED" (default "SUCCESS")
 * @param {Object} [payload.actor]    - override actor { id, fullName, role, email }
 */
const logAudit = async (req, payload) => {
  try {
    const actor = payload.actor || req?.staff;
    const schoolId = req?.schoolId || actor?.schoolId || null;

    await prisma.auditLog.create({
      data: {
        schoolId,
        staffId: actor?.id || null,
        actorName: actor?.fullName || null,
        actorRole: actor?.role?.name || actor?.roleName || null,
        actorEmail: actor?.email || null,
        action: payload.action,
        entity: payload.entity,
        entityId: payload.entityId || null,
        targetName: payload.targetName || null,
        changes: payload.changes || undefined,
        status: payload.status || "SUCCESS",
        ipAddress: extractIp(req),
        userAgent: req?.headers?.["user-agent"]?.slice(0, 500) || null,
      },
    });
  } catch (err) {
    // Never let audit failures bubble up
    console.error("Audit log write failed:", err.message);
  }
};

/**
 * Extracts the real client IP, handling proxies (Render, Cloudflare, etc).
 */
const extractIp = (req) => {
  if (!req) return null;
  const xff = req.headers?.["x-forwarded-for"];
  if (xff) {
    const first = String(xff).split(",")[0].trim();
    if (first) return first.slice(0, 100);
  }
  return (req.ip || req.socket?.remoteAddress || null)?.slice?.(0, 100) || null;
};

module.exports = { logAudit };
