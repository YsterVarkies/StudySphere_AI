const express = require("express");

const router = express.Router();

const {
    authenticateToken
} = require("../middleware/auth.middleware");

const {
    getPlannerTasks,
    getPlannerTask,
    createPlannerTask
} = require("../controllers/planner.controller");

// Get all planner tasks for the logged-in user
router.get("/", authenticateToken, getPlannerTasks);

// Get one planner task for the logged-in user
router.get("/:id", authenticateToken, getPlannerTask);

// Create a planner task for the logged-in user
router.post("/", authenticateToken, createPlannerTask);

module.exports = router;