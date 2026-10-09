const express = require("express");
const router = express.Router();

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

module.exports = router;