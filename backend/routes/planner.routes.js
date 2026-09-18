const express = require("express");

const router = express.Router();

const {
    getPlannerTasks,
    createPlannerTask
} = require("../controllers/planner.controller");

router.get("/", getPlannerTasks);
router.post("/", createPlannerTask);

module.exports = router;