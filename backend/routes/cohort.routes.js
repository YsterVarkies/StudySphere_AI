const express = require("express");
const router = express.Router();

const cohortController = require('../controllers/cohort.controller'); // <-- Make sure this is added here!

const {
    authenticateToken,
    requireRole
} = require("../middleware/auth.middleware");

router.get("/", authenticateToken, cohortController.getCohorts);
router.post("/", authenticateToken, requireRole("admin"), cohortController.createCohort);
router.put('/:id', authenticateToken, requireRole("admin"), cohortController.updateCohort);
router.delete('/:id', authenticateToken, requireRole("admin"), cohortController.deleteCohort);

module.exports = router;