
const express = require("express");
const router = express.Router();

const cohortController = require("../controllers/cohort.controller");

const {
    authenticateToken,
    requireRole
} = require("../middleware/auth.middleware");

// Public read-only endpoint for registration
router.get("/", cohortController.getCohorts);

// Admin-only cohort management
//router.get("/", authenticateToken, requireRole("admin"), cohortController.getCohorts);
router.post("/", authenticateToken, requireRole("admin"), cohortController.createCohort);
router.put("/:id", authenticateToken, requireRole("admin"), cohortController.updateCohort);
router.delete("/:id", authenticateToken, requireRole("admin"), cohortController.deleteCohort);

module.exports = router;