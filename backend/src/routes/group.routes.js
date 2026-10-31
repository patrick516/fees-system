const express = require("express");
const router = express.Router();
const { verifyStaff } = require("../middleware/auth");
const {
  listGroupSchools,
  addSchoolToGroup,
} = require("../controllers/group.controller");

// Middleware to ensure user is a group admin
const requireGroupAdmin = (req, res, next) => {
  if (!req.staff.isGroupAdmin) {
    return res
      .status(403)
      .json({ success: false, message: "Access denied. Group admins only." });
  }
  next();
};

router.use(verifyStaff);
router.use(requireGroupAdmin);

router.get("/schools", listGroupSchools);
router.post("/schools", addSchoolToGroup);

module.exports = router;
