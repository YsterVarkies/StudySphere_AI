const db = require('../config/db');
const Cohort = require("../models/cohort.model");


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

// Update a cohort and sync assigned modules
const updateCohort = async (req, res) => {
    try {
        const cohortId = req.params.id;
        const { cohort_name, academic_year, modules } = req.body;

        const [result] = await db.query(
            "UPDATE COHORT SET cohort_name = ?, academic_year = ? WHERE cohort_id = ?",
            [cohort_name, academic_year, cohortId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Cohort not found' });
        }

        await db.query("DELETE FROM COHORT_MODULE WHERE cohort_id = ?", [cohortId]);

        if (Array.isArray(modules) && modules.length > 0) {
            const values = modules.map(modId => [cohortId, modId]);
            await db.query(
                'INSERT INTO COHORT_MODULE (cohort_id, module_id) VALUES ?',
                [values]
            );
        }

        return res.status(200).json({ message: 'Cohort and modules updated successfully' });
    } catch (error) {
        console.error('Error updating cohort:', error);
        return res.status(500).json({ message: 'Failed to update cohort' });
    }
};
// Delete a cohort
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
            return res.status(404).json({ message: "Cohort not found." });
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
        return res.status(500).json({ message: "Server error while retrieving cohort." });
    }
};

// Create a cohort and assign selected modules
const createCohort = async (req, res) => {
    try {
        const { cohort_name, academic_year, modules } = req.body;
        if (!cohort_name || !academic_year) {
            return res.status(400).json({ message: "Please provide cohort name and academic year." });
        }

        const result = await Cohort.createCohort(cohort_name, academic_year);
        const newCohortId = result.insertId;

        if (Array.isArray(modules) && modules.length > 0) {
            const values = modules.map(modId => [newCohortId, modId]);
            await db.query(
                'INSERT INTO COHORT_MODULE (cohort_id, module_id) VALUES ?',
                [values]
            );
        }

        return res.status(201).json({
            message: "Cohort created and modules assigned successfully.",
            cohort: {
                cohort_id: newCohortId,
                cohort_name,
                academic_year
            }
        });

    } catch (error) {
        console.error("Cohort creation error:", error);
        return res.status(500).json({ message: "Server error while creating cohort." });
    }
};

// NEW COHORT-MODULE ASSIGNMENT FUNCTIONS

// Get all modules assigned to a specific cohort
const getCohortModules = async (req, res) => {
    try {
        const cohortId = req.params.id;
        const [modules] = await db.query(
            `SELECT m.module_id, m.module_code, m.module_name, m.description 
             FROM MODULE m
             JOIN COHORT_MODULE cm ON m.module_id = cm.module_id
             WHERE cm.cohort_id = ?`,
            [cohortId]
        );
        return res.status(200).json({ success: true, modules });
    } catch (err) {
        console.error('Error fetching cohort modules:', err);
        return res.status(500).json({ error: 'Server error while fetching cohort modules.' });
    }
};

// Assign a module to a cohort
const assignModuleToCohort = async (req, res) => {
    try {
        const cohortId = req.params.id;
        const { module_id } = req.body;
        if (!module_id) {
            return res.status(400).json({ error: 'Please provide a module_id.' });
        }
        await db.query(
            'INSERT INTO COHORT_MODULE (cohort_id, module_id) VALUES (?, ?)',
            [cohortId, module_id]
        );
        return res.status(201).json({ success: true, message: 'Module assigned to cohort successfully.' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'This module is already assigned to this cohort.' });
        }
        console.error('Error assigning module to cohort:', err);
        return res.status(500).json({ error: 'Server error while assigning module.' });
    }
};

// Remove a module from a cohort
const removeModuleFromCohort = async (req, res) => {
    try {
        const { id: cohortId, moduleId } = req.params;
        const [result] = await db.query(
            'DELETE FROM COHORT_MODULE WHERE cohort_id = ? AND module_id = ?',
            [cohortId, moduleId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Assignment not found.' });
        }
        return res.status(200).json({ success: true, message: 'Module removed from cohort successfully.' });
    } catch (err) {
        console.error('Error removing module from cohort:', err);
        return res.status(500).json({ error: 'Server error while removing module.' });
    }
};


module.exports = {
    getCohorts,
    deleteCohort,
    updateCohort,
    getCohort,
    createCohort,
    getCohortModules,
    assignModuleToCohort,
    removeModuleFromCohort
};