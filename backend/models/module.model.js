const db = require("../config/db");

// Get all modules
const getAllModules = async () => {
    const [rows] = await db.query(`
        SELECT
            module_id,
            module_code,
            module_name,
            description,
            created_at
        FROM \`MODULE\`
        ORDER BY module_code
    `);

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