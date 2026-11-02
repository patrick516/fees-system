const prisma = require("../config/db");

//  Extracts schoolSlug from either:
//   1. Subdomain:  mulanje-mission.schoolpay.mw  →  "mulanje-mission"
//   2. Query param: schoolpay.mw/login?school=mulanje-mission  →  "mulanje-mission"
//   3. Header:     x-school-slug: mulanje-mission  (for API clients)
//
// Then resolves it to the school's UUID and attaches req.schoolId.
//
// Rejects with 400 if no slug, 404 if slug doesn't match any school.
// NEVER trusts a client-provided schoolId — only the slug, which is
// then validated against the DB.

const resolveSchool = async (req, res, next) => {
  try {
    let slug = null;

    // 1. Subdomain check (production)
    const host = req.hostname || "";
    const parts = host.split(".");
    if (parts.length >= 3 && !["www", "api"].includes(parts[0])) {
      slug = parts[0];
    }

    // 2. Query param (fallback / dev)
    if (!slug && req.query.school) {
      slug = String(req.query.school).toLowerCase().trim();
    }

    // 3. Header (for API integrations)
    if (!slug && req.headers["x-school-slug"]) {
      slug = String(req.headers["x-school-slug"]).toLowerCase().trim();
    }

    if (!slug) {
      return res.status(400).json({
        success: false,
        code: "NO_SCHOOL_CONTEXT",
        message: "School context required. Visit your school's login URL.",
      });
    }

    // Validate format (lowercase, alphanumeric, hyphens only)
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_SCHOOL_SLUG",
        message: "Invalid school identifier.",
      });
    }

    const school = await prisma.school.findUnique({
      where: { slug },
      select: { id: true, name: true, isActive: true },
    });

    if (!school) {
      return res.status(404).json({
        success: false,
        code: "SCHOOL_NOT_FOUND",
        message: "School not found. Check your login URL.",
      });
    }

    if (!school.isActive) {
      return res.status(403).json({
        success: false,
        code: "SCHOOL_INACTIVE",
        message: "This school's account is inactive.",
      });
    }

    //  Attach to request — downstream controllers use this
    req.schoolId = school.id;
    req.schoolSlug = slug;
    req.schoolName = school.name;

    next();
  } catch (err) {
    console.error("resolveSchool error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to resolve school context",
    });
  }
};

module.exports = { resolveSchool };
