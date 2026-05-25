const express = require("express");
const router = express.Router();
const { verifyStaff } = require("../middleware/auth");
const { isAdmin, isBursar } = require("../middleware/role");
const prisma = require("../config/db");

// GET /api/schools/classes
router.get("/classes", verifyStaff, isBursar, async (req, res) => {
  try {
    const classes = await prisma.class.findMany({
      where: { schoolId: req.schoolId, isActive: true },
      include: { _count: { select: { students: true } } },
      orderBy: { level: "asc" },
    });
    res.json({ success: true, data: classes });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to get classes" });
  }
});

router.post("/classes", verifyStaff, isAdmin, async (req, res) => {
  try {
    const { name, level } = req.body;
    if (!name || !level) {
      return res
        .status(400)
        .json({ success: false, message: "Name and level are required" });
    }

    const cls = await prisma.class.create({
      data: { schoolId: req.schoolId, name, level: parseInt(level) },
    });

    res.status(201).json({ success: true, data: cls });
  } catch (err) {
    if (err.code === "P2002") {
      return res
        .status(409)
        .json({ success: false, message: "Class already exists" });
    }

    res.status(500).json({ success: false, message: "Failed to create class" });
  }
});
module.exports = router;
