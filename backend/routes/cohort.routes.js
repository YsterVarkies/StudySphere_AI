const express = require("express");

const router = express.Router();

const {
    authenticateToken,
    requireRole
} = require("../middleware/auth.middleware");

const {
    getCohorts,
    getCohort,
    createCohort
} = require("../controllers/cohort.controller");

// Get all cohorts
router.get("/", authenticateToken, getCohorts);

// Get one cohort
router.get("/:id", authenticateToken, getCohort);

// Create a cohort - admin only
router.post("/", authenticateToken, requireRole("admin"), createCohort);

module.exports = router;