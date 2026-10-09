
const db = require('../config/db');const Cohort = require("../models/cohort.model");


// Get all cohorts
const getCohorts = async (req, res) => {
    try {
        const cohorts = await Cohort.getAllCohorts();

        const formattedCohorts = cohorts.map(c => ({
            id: c.cohort_id,
            name: c.cohort_name,
            academicYear: c.academic_year || 2026
        }));

        return res.status(200).json({
            message: "Cohorts retrieved successfully.",
            cohorts: formattedCohorts
        });

    } catch (error) {
        console.error("Cohort retrieval error:", error);

        return res.status(500).json({
            message: "Server error while retrieving cohorts."
        });
    }
};

const updateCohort = async (req, res) => {
    try {
        const cohortId = req.params.id;
        const { cohort_name, academic_year } = req.body;

        // If your columns are named 'name' and 'academic_year', adjust them here:
        const [result] = await db.query(
            "UPDATE COHORT SET cohort_name = ?, academic_year = ? WHERE cohort_id = ?",
            [cohort_name, academic_year, cohortId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Cohort not found' });
        }

        return res.status(200).json({ message: 'Cohort updated successfully' });
    } catch (error) {
        console.error('Error updating cohort:', error);
        return res.status(500).json({ message: 'Failed to update cohort' });
    }
};

const deleteCohort = async (req, res) => {
    try {
        const cohortId = req.params.id;

        // Clear dependency links
        await db.query("DELETE FROM COHORT_MODULE WHERE cohort_id = ?", [cohortId]);

        const [result] = await db.query("DELETE FROM COHORT WHERE cohort_id = ?", [cohortId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Cohort not found' });
        }

        return res.status(200).json({ message: 'Cohort deleted successfully' });
    } catch (error) {
        console.error('Error deleting cohort:', error);
        return res.status(500).json({ message: 'Failed to delete cohort due to foreign key constraints.' });
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

        const formattedCohort = {
            id: cohort.cohort_id,
            name: cohort.cohort_name,
            academicYear: cohort.academic_year || 2026
        };

        return res.status(200).json({
            message: "Cohort retrieved successfully.",
            cohort: formattedCohort
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
    deleteCohort,
    updateCohort,
    getCohort,
    createCohort
};