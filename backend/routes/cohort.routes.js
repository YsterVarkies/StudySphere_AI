const express = require("express");

const router = express.Router();

const {
    getCohorts,
    createCohort
} = require("../controllers/cohort.controller");

router.get("/", getCohorts);
router.post("/", createCohort);

module.exports = router;