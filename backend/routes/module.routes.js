const express = require("express");

const router = express.Router();

const moduleController = require('../controllers/module.controller');

const {
    authenticateToken,
    requireRole
} = require("../middleware/auth.middleware");

const {
    getModules,
    createModule
} = require("../controllers/module.controller");

router.get("/", authenticateToken, requireRole("admin"), moduleController.getModules);
router.post("/", authenticateToken, requireRole("admin"), createModule);
router.put('/:id', authenticateToken, requireRole("admin"), moduleController.updateModule);
router.delete('/:id', authenticateToken, requireRole("admin"), moduleController.deleteModule);

module.exports = router;