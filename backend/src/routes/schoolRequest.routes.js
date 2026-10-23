const express = require("express");
const router = express.Router();
const controller = require("../controllers/schoolRequest.controller");

// Public — marketing site submits the request
router.post("/", controller.submitRequest);

module.exports = router;
