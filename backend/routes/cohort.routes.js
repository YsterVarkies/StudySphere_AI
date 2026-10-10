
const express = require("express");
const router = express.Router();

const {
    authenticateToken,
    requireRole
} = require("../middleware/auth.middleware");
const cohortController = require("../controllers/cohort.controller");

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


router.get("/", getCohorts);
router.post("/", createCohort);
router.get("/:id", getCohort);
router.put("/:id", updateCohort);
router.delete("/:id", deleteCohort);


router.get("/:id/modules", getCohortModules);
router.post("/:id/modules", assignModuleToCohort);
router.delete("/:id/modules/:moduleId", removeModuleFromCohort);
// Public read-only endpoint for registration
router.get("/", cohortController.getCohorts);

// Admin-only cohort management
//router.get("/", authenticateToken, requireRole("admin"), cohortController.getCohorts);
router.post("/", authenticateToken, requireRole("admin"), cohortController.createCohort);
router.put("/:id", authenticateToken, requireRole("admin"), cohortController.updateCohort);
router.delete("/:id", authenticateToken, requireRole("admin"), cohortController.deleteCohort);

module.exports = router;