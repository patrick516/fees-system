// Check staff role - use after verifyStaff
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.staff) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!roles.includes(req.staff.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(" or ")}`,
      });
    }

    next();
  };
};

// Shorthand role checkers
const isAdmin = requireRole("SUPER_ADMIN", "SCHOOL_ADMIN");
const isBursar = requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BURSAR");
const isSuperAdmin = requireRole("SUPER_ADMIN");

module.exports = { requireRole, isAdmin, isBursar, isSuperAdmin };
