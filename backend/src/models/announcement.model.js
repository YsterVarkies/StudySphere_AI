const db = require('../../config/db');

const Announcement = {
  /**
   * Create a new announcement
   */
  async create({ moduleId, createdByUserId, title, content }) {
    const [result] = await db.execute(
      `INSERT INTO ANNOUNCEMENT (module_id, created_by_user_id, title, content, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [moduleId, createdByUserId, title, content]
    );
    return result.insertId;
  },

  /**
   * Get one announcement by ID
   */
  async getById(announcementId) {
    const [rows] = await db.execute(
      `SELECT a.*, u.first_name, u.last_name, m.module_name
       FROM ANNOUNCEMENT a
       LEFT JOIN USER u ON a.created_by_user_id = u.user_id
       LEFT JOIN MODULE m ON a.module_id = m.module_id
       WHERE a.announcement_id = ?`,
      [announcementId]
    );
    return rows[0] || null;
  },

  /**
   * Get all announcements (optionally filter by module)
   */
  async getAll(moduleId = null) {
    let query = `
      SELECT a.*, u.first_name, u.last_name, m.module_name
      FROM ANNOUNCEMENT a
      LEFT JOIN USER u ON a.created_by_user_id = u.user_id
      LEFT JOIN MODULE m ON a.module_id = m.module_id
    `;
    const params = [];

    if (moduleId) {
      query += ` WHERE a.module_id = ?`;
      params.push(moduleId);
    }

    query += ` ORDER BY a.created_at DESC`;

    const [rows] = await db.execute(query, params);
    return rows;
  },

  /**
   * Update an announcement
   */
  async update(announcementId, { title, content }) {
    const [result] = await db.execute(
      `UPDATE ANNOUNCEMENT
       SET title = ?, content = ?
       WHERE announcement_id = ?`,
      [title, content, announcementId]
    );
    return result.affectedRows > 0;
  },

  /**
   * Delete an announcement
   */
  async delete(announcementId) {
    const [result] = await db.execute(
      `DELETE FROM ANNOUNCEMENT WHERE announcement_id = ?`,
      [announcementId]
    );
    return result.affectedRows > 0;
  },
};

module.exports = Announcement;