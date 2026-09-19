const db = require("../config/db");

// Get all cohorts
const getAllCohorts = async () => {
    const [rows] = await db.query(`
        SELECT
            cohort_id,
            cohort_name,
            academic_year,
            created_at
        FROM \`COHORT\`
        ORDER BY academic_year DESC, cohort_name
    `);

    return rows;
};

// Get one cohort by ID
const getCohortById = async (cohortId) => {
    const [rows] = await db.query(`
        SELECT
            cohort_id,
            cohort_name,
            academic_year,
            created_at
        FROM \`COHORT\`
        WHERE cohort_id = ?
    `, [cohortId]);

    return rows[0];
};

// Create a new cohort
const createCohort = async (cohortName, academicYear) => {
    const [result] = await db.query(
        `INSERT INTO \`COHORT\`
        (cohort_name, academic_year)
        VALUES (?, ?)`,
        [cohortName, academicYear]
    );

    return result;
};

module.exports = {
    getAllCohorts,
    getCohortById,
    createCohort
};