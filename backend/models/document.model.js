const db = require("../config/db");

// Get all documents belonging to a user
const getDocumentsByUser = async (userId) => {
    const [rows] = await db.query(`
        SELECT
            d.document_id,
            d.user_id,
            d.module_id,
            m.module_code,
            m.module_name,
            d.title,
            d.file_path,
            d.file_type,
            d.file_size,
            d.openai_file_id,
            d.uploaded_at
        FROM \`DOCUMENT\` d
        INNER JOIN \`MODULE\` m
            ON d.module_id = m.module_id
        WHERE d.user_id = ?
        ORDER BY d.uploaded_at DESC
    `, [userId]);

    return rows;
};

// Get one document belonging to a user
const getDocumentById = async (documentId, userId) => {
    const [rows] = await db.query(`
        SELECT
            d.document_id,
            d.user_id,
            d.module_id,
            m.module_code,
            m.module_name,
            d.title,
            d.file_path,
            d.file_type,
            d.file_size,
            d.openai_file_id,
            d.uploaded_at
        FROM \`DOCUMENT\` d
        INNER JOIN \`MODULE\` m
            ON d.module_id = m.module_id
        WHERE d.document_id = ?
          AND d.user_id = ?
    `, [documentId, userId]);

    return rows[0];
};


 // Count all documents belonging to a student
const countDocumentsByUser = async (userId) => {
    const [rows] = await db.query(
        `SELECT COUNT(*) AS total
         FROM \`DOCUMENT\`
         WHERE user_id = ?`,
        [userId]
    );

    return Number(rows[0].total);
};

// Count documents belonging to a student in one module
const countDocumentsByUserAndModule = async (userId, moduleId) => {
    const [rows] = await db.query(
        `SELECT COUNT(*) AS total
         FROM \`DOCUMENT\`
         WHERE user_id = ?
           AND module_id = ?`,
        [userId, moduleId]
    );

    return Number(rows[0].total);
};


// Create a document
const createDocument = async (
    userId,
    moduleId,
    title,
    filePath,
    fileType,
    fileSize,
    openaiFileId
) => {
    const [result] = await db.query(
        `INSERT INTO \`DOCUMENT\`
        (
            user_id,
            module_id,
            title,
            file_path,
            file_type,
            file_size,
            openai_file_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            userId,
            moduleId,
            title,
            filePath,
            fileType || null,
            fileSize,
            openaiFileId || null
        ]
    );

    return result;
};


// Permanently delete a document record belonging to a user
const deleteDocument = async (documentId, userId) => {
    const [result] = await db.query(
        `DELETE FROM \`DOCUMENT\`
         WHERE document_id = ?
           AND user_id = ?`,
        [documentId, userId]
    );

    return result;
};


module.exports = {
    getDocumentsByUser,
    getDocumentById,
    createDocument,
    deleteDocument,
    countDocumentsByUser,
    countDocumentsByUserAndModule
};