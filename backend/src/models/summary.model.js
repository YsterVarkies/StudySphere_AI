const db = require('../../config/db');

const Summary = {
  async create({ sourceDocumentId, createdByUserId, title, summaryText }) {
    const [result] = await db.execute(
      `INSERT INTO summary (source_document_id, created_by_user_id, title, summary_text, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [sourceDocumentId, createdByUserId, title, summaryText]
    );
    return result.insertId;
  },

  async getById(summaryId, userId) {
    const [rows] = await db.execute(
      `SELECT s.*, d.title AS document_title
       FROM SUMMARY s
       LEFT JOIN document d ON s.source_document_id = d.document_id
       WHERE s.summary_id = ? AND s.created_by_user_id = ?`,
      [summaryId, userId]
    );
    return rows[0] || null;
  },

  async getByUser(userId, documentId = null) {
    let query = `
      SELECT s.*, d.title AS document_title
      FROM SUMMARY s
      LEFT JOIN document d ON s.source_document_id = d.document_id
      WHERE s.created_by_user_id = ?
    `;
    const params = [userId];

    if (documentId) {
      query += ` AND s.source_document_id = ?`;
      params.push(documentId);
    }

    query += ` ORDER BY s.created_at DESC`;

    const [rows] = await db.execute(query, params);
    return rows;
  },

  async delete(summaryId, userId) {
    const [result] = await db.execute(
      `DELETE FROM SUMMARY WHERE summary_id = ? AND created_by_user_id = ?`,
      [summaryId, userId]
    );
    return result.affectedRows > 0;
  },
};

module.exports = Summary;