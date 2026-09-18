const express = require("express");

const router = express.Router();

const { authenticateToken } = require("../middleware/auth.middleware");

const { getDashboard } = require("../controllers/dashboard.controller");

router.get("/", authenticateToken, getDashboard);

module.exports = router;