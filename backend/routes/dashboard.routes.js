const express = require("express");

const router = express.Router();

const { authenticateToken } = require("../middleware/auth.middleware");

const {
	getDashboard,
	createPlannerDeadline,
	updatePlannerDeadline,
	deletePlannerDeadline
} = require("../controllers/dashboard.controller");

router.get("/", authenticateToken, getDashboard);
router.post("/deadlines", authenticateToken, createPlannerDeadline);
router.patch("/deadlines/:id", authenticateToken, updatePlannerDeadline);
router.delete("/deadlines/:id", authenticateToken, deletePlannerDeadline);

module.exports = router;