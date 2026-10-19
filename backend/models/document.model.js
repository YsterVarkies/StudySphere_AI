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


// Permanently delete a document record belonging to a user.
// Saved chats, quizzes, flashcard sets and summaries are kept;
// they are simply unlinked from the deleted document.
const deleteDocument = async (documentId, userId) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Confirm ownership and lock the row
        const [owned] = await connection.query(
            `SELECT document_id
             FROM \`DOCUMENT\`
             WHERE document_id = ?
               AND user_id = ?
             FOR UPDATE`,
            [documentId, userId]
        );

        if (owned.length === 0) {
            await connection.rollback();
            return { affectedRows: 0 };
        }

        // Unlink saved chats instead of deleting them
        await connection.query(
            `UPDATE CHAT_SESSION
             SET document_id = NULL
             WHERE document_id = ?`,
            [documentId]
        );

        // Unlink saved flashcard sets
        await connection.query(
            `UPDATE FLASHCARD_SET
             SET document_id = NULL
             WHERE document_id = ?`,
            [documentId]
        );

        // Unlink saved quizzes
        await connection.query(
            `UPDATE QUIZ
             SET document_id = NULL
             WHERE document_id = ?`,
            [documentId]
        );

        // Unlink saved summaries
        await connection.query(
            `UPDATE SUMMARY
             SET source_document_id = NULL
             WHERE source_document_id = ?`,
            [documentId]
        );

        // Delete the document record
        const [result] = await connection.query(
            `DELETE FROM \`DOCUMENT\`
             WHERE document_id = ?
               AND user_id = ?`,
            [documentId, userId]
        );

        await connection.commit();

        return result;

    } catch (error) {
        await connection.rollback();
        throw error;

    } finally {
        connection.release();
    }
};

module.exports = {
    getDocumentsByUser,
    getDocumentById,
    createDocument,
     deleteDocument
};