const db = require("../config/db");

// Get all modules

const getAllModules = async (userId, role) => {
    // Admins can view all modules.
    if (role === "admin") {
        const [rows] = await db.query(`
            SELECT module_id, module_code, module_name,
                   description, created_at
            FROM \`MODULE\`
            ORDER BY module_code
        `);

        return rows;
    }

    // Students can view only modules assigned to their cohort.
    const [rows] = await db.query(
        `
        SELECT DISTINCT
            m.module_id,
            m.module_code,
            m.module_name,
            m.description,
            m.created_at
        FROM \`USER\` u
        INNER JOIN COHORT_MODULE cm
            ON cm.cohort_id = u.cohort_id
        INNER JOIN \`MODULE\` m
            ON m.module_id = cm.module_id
        WHERE u.user_id = ?
          AND u.role = 'student'
        ORDER BY m.module_code
        `,
        [userId]
    );

    return rows;
};


// Create a new module
const createModule = async (moduleCode, moduleName, description) => {
    const [result] = await db.query(
        `INSERT INTO \`MODULE\`
        (module_code, module_name, description)
        VALUES (?, ?, ?)`,
        [moduleCode, moduleName, description]
    );

    return result;
};

module.exports = {
    getAllModules,
    createModule
};