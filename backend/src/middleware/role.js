// backend/src/middleware/role.js

// ==================== ROLE-NAME BASED CHECK ====================
// Use: requireRole("School Admin", "Bursar")
// School Admin always passes (safety fallback).
const requireRole = (...allowedRoleNames) => {
  return (req, res, next) => {
    if (!req.staff) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const roleName = req.staff.role?.name;

    // School Admin always passes
    if (roleName === "School Admin") return next();

    if (!roleName || !allowedRoleNames.includes(roleName)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoleNames.join(" or ")}`,
      });
    }

    next();
  };
};

// ==================== PERMISSION-BASED CHECK ====================
// Use: requirePermission("students", "write")
// School Admin always passes (safety fallback).
const requirePermission = (resource, action) => {
  return (req, res, next) => {
    if (!req.staff) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const role = req.staff.role;
    if (!role) {
      return res.status(403).json({
        success: false,
        message: "No role assigned to this account.",
      });
    }

    // School Admin always passes
    if (role.name === "School Admin") return next();

    const perms = role.permissions?.[resource];
    if (!Array.isArray(perms) || !perms.includes(action)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. You don't have "${action}" permission on ${resource}.`,
        code: "INSUFFICIENT_PERMISSIONS",
        resource,
        action,
      });
    }

    next();
  };
};

// ==================== SHORTHAND CHECKERS ====================
const isAdmin = requireRole("School Admin");
const isBursar = requireRole("School Admin", "Bursar");
const isSuperAdmin = requireRole("School Admin"); // (no SUPER_ADMIN role anymore)

module.exports = {
  requireRole,
  requirePermission,
  isAdmin,
  isBursar,
  isSuperAdmin,
};
