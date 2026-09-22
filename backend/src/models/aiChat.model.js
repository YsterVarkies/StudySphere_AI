/*const db = require('../../config/db');

const AiChat = {
  async createSession({ userId, moduleId, documentId, title }) {
    const [result] = await db.execute(
      `INSERT INTO chat_session (user_id, module_id, document_id, title, started_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [userId, moduleId, documentId || null, title || 'New Chat']
    );
    return result.insertId;
  },

  async getSessionById(sessionId, userId) {
    const [rows] = await db.execute(
      `SELECT * FROM chat_session
       WHERE chat_session_id = ? AND user_id = ?`,
      [sessionId, userId]
    );
    return rows[0] || null;
  },

  async getSessionsByUser(userId, moduleId = null) {
    let query = `
      SELECT cs.*, d.title AS document_title
      FROM chat_session cs
      LEFT JOIN document d ON cs.document_id = d.document_id
      WHERE cs.user_id = ?
    `;
    const params = [userId];

    if (moduleId) {
      query += ` AND cs.module_id = ?`;
      params.push(moduleId);
    }

    query += ` ORDER BY cs.started_at DESC`;

    const [rows] = await db.execute(query, params);
    return rows;
  },

  async saveMessage({ sessionId, sender, messageText }) {
    const [result] = await db.execute(
      `INSERT INTO chat_message (chat_session_id, sender, message_text, created_at)
       VALUES (?, ?, ?, NOW())`,
      [sessionId, sender, messageText]
    );
    return result.insertId;
  },

  async getMessages(sessionId) {
    const [rows] = await db.execute(
      `SELECT message_id, sender, message_text, created_at
       FROM chat_message
       WHERE chat_session_id = ?
       ORDER BY created_at ASC`,
      [sessionId]
    );
    return rows;
  },

  async getAllMessagesByUser(userId) {
    const [rows] = await db.execute(
      `SELECT m.message_id, m.chat_session_id, m.sender, m.message_text, m.created_at,
              cs.title AS session_title
       FROM chat_message m
       INNER JOIN chat_session cs ON m.chat_session_id = cs.chat_session_id
       WHERE cs.user_id = ?
       ORDER BY m.created_at ASC`,
      [userId]
    );
    return rows;
  },

  async deleteSession(sessionId, userId) {
    const [result] = await db.execute(
      `DELETE FROM chat_session WHERE chat_session_id = ? AND user_id = ?`,
      [sessionId, userId]
    );
    return result.affectedRows > 0;
  },
};

module.exports = AiChat;*/s