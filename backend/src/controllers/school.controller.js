const prisma = require("../config/db");
const { uploadToCloudinary } = require("../lib/cloudinary");

// Turn "St Peters Private School" into "st-peters-private-school"
const slugify = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

// GET /api/schools/settings
const getSettings = async (req, res) => {
  try {
    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        phone: true,
        email: true,
        logo: true,
        motto: true,
      },
    });

    if (!school) {
      return res
        .status(404)
        .json({ success: false, message: "School not found" });
    }

    res.json({ success: true, data: school });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to get settings" });
  }
};

// PUT /api/schools/settings
// PUT /api/schools/settings
const updateSettings = async (req, res) => {
  try {
    const { name, address, city, phone, email, motto } = req.body;

    // Auto-generate a slug the first time a school is saved, if it doesn't have one yet
    const existing = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: { slug: true },
    });

    let slugUpdate = {};
    if (!existing.slug && name) {
      let baseSlug = slugify(name);
      let candidate = baseSlug;
      let counter = 1;
      // Ensure uniqueness in case two schools have similar names
      while (
        await prisma.school.findFirst({
          where: { slug: candidate, id: { not: req.schoolId } },
        })
      ) {
        candidate = `${baseSlug}-${counter}`;
        counter++;
      }
      slugUpdate = { slug: candidate };
    }

    const updated = await prisma.school.update({
      where: { id: req.schoolId },
      data: {
        ...(name && { name }),
        ...(address && { address }),
        ...(city && { city }),
        ...(phone && { phone }),
        ...(email !== undefined && { email }),
        ...(motto !== undefined && { motto }),
        ...slugUpdate,
      },
    });

    await prisma.auditLog.create({
      data: {
        schoolId: req.schoolId,
        staffId: req.staff.id,
        action: "SCHOOL_SETTINGS_UPDATED",
        entity: "School",
        entityId: req.schoolId,
        changes: { name, address, city, phone, email, motto },
      },
    });

    res.json({
      success: true,
      message: "Settings updated successfully",
      data: updated,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to update settings" });
  }
};

// POST /api/schools/settings/logo
const uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No logo file provided" });
    }

    const result = await uploadToCloudinary(req.file.buffer, {
      folder: process.env.CLOUDINARY_LOGO_FOLDER || "school_logos",
    });

    const updated = await prisma.school.update({
      where: { id: req.schoolId },
      data: { logo: result.secure_url },
    });

    await prisma.auditLog.create({
      data: {
        schoolId: req.schoolId,
        staffId: req.staff.id,
        action: "SCHOOL_LOGO_UPDATED",
        entity: "School",
        entityId: req.schoolId,
        changes: { logo: result.secure_url },
      },
    });

    res.json({
      success: true,
      message: "Logo uploaded successfully",
      data: { logo: updated.logo },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to upload logo" });
  }
};

// GET /api/schools/by-slug/:slug
// Public — no auth. Used on the branded login page (/login/:slug) to show
// that school's logo/name/motto before the user has typed anything.
const getBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const school = await prisma.school.findUnique({
      where: { slug },
      select: { name: true, logo: true, motto: true },
    });

    if (!school) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.json({ success: true, data: school });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lookup failed" });
  }
};

// GET /api/schools/lookup-by-email?email=...
// Public — no auth. Used on the staff login page to preview the school's
// logo before the admin has signed in, based on their staff email.
const lookupByEmail = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const staff = await prisma.staff.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        school: {
          select: { name: true, logo: true },
        },
      },
    });

    if (!staff) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.json({ success: true, data: staff.school });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lookup failed" });
  }
};

// GET /api/schools/public
// Public — no auth. Since each deployment serves exactly one school,
// this returns that school's branding without needing an ID.
// Used by the parent website's login page before anyone has logged in.
const getPublicSchool = async (req, res) => {
  try {
    const school = await prisma.school.findFirst({
      select: { id: true, name: true, logo: true, motto: true },
    });

    if (!school) {
      return res
        .status(404)
        .json({ success: false, message: "No school found" });
    }

    res.json({ success: true, data: school });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to get school info" });
  }
};

// GET /api/schools/public/:schoolId
// Public — no auth. Used to show school branding (logo/name/motto) on pages
// where the schoolId is already known but the user isn't logged in yet.
const getPublicInfo = async (req, res) => {
  try {
    const school = await prisma.school.findUnique({
      where: { id: req.params.schoolId },
      select: { name: true, logo: true, motto: true },
    });

    if (!school) {
      return res
        .status(404)
        .json({ success: false, message: "School not found" });
    }

    res.json({ success: true, data: school });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to get school info" });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  uploadLogo,
  getPublicInfo,
  lookupByEmail,
  getBySlug,
  getPublicSchool,
};
