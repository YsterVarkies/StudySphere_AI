const express = require("express");
const router = express.Router();

const {
    authenticateToken,
    requireRole
} = require("../middleware/auth.middleware");

const {
    getCohorts,
    createCohort,
    getCohort,
    updateCohort,
    deleteCohort,
    getCohortModules,
    assignModuleToCohort,
    removeModuleFromCohort
} = require("../controllers/cohort.controller");

// Read routes
router.get("/", getCohorts);
router.get("/:id", getCohort);
router.get("/:id/modules", getCohortModules);

// Admin-only cohort management
router.post("/", authenticateToken, requireRole("admin"), createCohort);
router.put("/:id", authenticateToken, requireRole("admin"), updateCohort);
router.delete("/:id", authenticateToken, requireRole("admin"), deleteCohort);
router.post("/:id/modules", authenticateToken, requireRole("admin"), assignModuleToCohort);
router.delete("/:id/modules/:moduleId", authenticateToken, requireRole("admin"), removeModuleFromCohort);

module.exports = router;