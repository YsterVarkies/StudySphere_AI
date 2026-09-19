const express = require("express");

const router = express.Router();

const {
    authenticateToken,
    requireRole
} = require("../middleware/auth.middleware");

const {
    getModules,
    createModule
} = require("../controllers/module.controller");

router.get("/", authenticateToken, getModules);

router.post("/", authenticateToken, requireRole("admin"), createModule);

module.exports = router;