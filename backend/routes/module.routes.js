
const express = require("express");
const router = express.Router();

const moduleController = require("../controllers/module.controller");
const {
    authenticateToken,
    requireRole
} = require("../middleware/auth.middleware");

// Logged-in students and admins can view modules
router.get("/", authenticateToken, moduleController.getModules);

// Only admins can manage modules
router.post("/", authenticateToken, requireRole("admin"), moduleController.createModule);
router.put("/:id", authenticateToken, requireRole("admin"), moduleController.updateModule);
router.delete("/:id", authenticateToken, requireRole("admin"), moduleController.deleteModule);

module.exports = router;