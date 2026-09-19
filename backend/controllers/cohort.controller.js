const Cohort = require("../models/cohort.model");

// Get all cohorts
const getCohorts = async (req, res) => {
    try {
        const cohorts = await Cohort.getAllCohorts();

        return res.status(200).json({
            message: "Cohorts retrieved successfully.",
            cohorts
        });

    } catch (error) {
        console.error("Cohort retrieval error:", error);

        return res.status(500).json({
            message: "Server error while retrieving cohorts."
        });
    }
};

// Get one cohort
const getCohort = async (req, res) => {
    try {
        const cohortId = req.params.id;

        const cohort = await Cohort.getCohortById(cohortId);

        if (!cohort) {
            return res.status(404).json({
                message: "Cohort not found."
            });
        }

        return res.status(200).json({
            message: "Cohort retrieved successfully.",
            cohort
        });

    } catch (error) {
        console.error("Cohort retrieval error:", error);

        return res.status(500).json({
            message: "Server error while retrieving cohort."
        });
    }
};

// Create a cohort
const createCohort = async (req, res) => {
    try {
        const {
            cohort_name,
            academic_year
        } = req.body;

        if (!cohort_name || !academic_year) {
            return res.status(400).json({
                message: "Please provide cohort name and academic year."
            });
        }

        const result = await Cohort.createCohort(
            cohort_name,
            academic_year
        );

        return res.status(201).json({
            message: "Cohort created successfully.",
            cohort: {
                cohort_id: result.insertId,
                cohort_name,
                academic_year
            }
        });

    } catch (error) {
        console.error("Cohort creation error:", error);

        return res.status(500).json({
            message: "Server error while creating cohort."
        });
    }
};

module.exports = {
    getCohorts,
    getCohort,
    createCohort
};