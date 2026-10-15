const db = require('../../config/db');

const Announcement = {
  /**
   * Create a new announcement
   */
  async create({ moduleId, createdByUserId, title, content, category }) {
    const [result] = await db.execute(
      `INSERT INTO ANNOUNCEMENT
        (module_id, created_by_user_id, title, content, category, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        moduleId ?? null,
        createdByUserId,
        title,
        content,
        category,
      ]
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
       LEFT JOIN USER u
         ON a.created_by_user_id = u.user_id
       LEFT JOIN MODULE m
         ON a.module_id = m.module_id
       WHERE a.announcement_id = ?`,
      [announcementId]
    );

    return rows[0] || null;
  },

  
  /**
   * Get announcements visible to a student:
   * campus-wide announcements plus announcements
   * for modules linked to the student's cohort.
   */
  async getVisibleToStudent(userId) {
    const [rows] = await db.execute(
      `SELECT a.*, u.first_name, u.last_name, m.module_name
       FROM ANNOUNCEMENT a
       LEFT JOIN USER u
         ON a.created_by_user_id = u.user_id
       LEFT JOIN MODULE m
         ON a.module_id = m.module_id
       WHERE a.module_id IS NULL
          OR EXISTS (
            SELECT 1
            FROM \`USER\` student
            JOIN COHORT_MODULE cm
              ON cm.cohort_id = student.cohort_id
            WHERE student.user_id = ?
              AND cm.module_id = a.module_id
          )
       ORDER BY a.created_at DESC
       LIMIT 10`,
      [userId]
    );

    return rows;
  },


  /**
   * Get all announcements (optionally filter by module)
   */
  async getAll(moduleId = null) {
    let query = `
      SELECT a.*, u.first_name, u.last_name, m.module_name
      FROM ANNOUNCEMENT a
      LEFT JOIN USER u
        ON a.created_by_user_id = u.user_id
      LEFT JOIN MODULE m
        ON a.module_id = m.module_id
    `;

    const params = [];

    if (moduleId !== null && moduleId !== undefined) {
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
  async update(announcementId, { title, content, category }) {
    const [result] = await db.execute(
      `UPDATE ANNOUNCEMENT
       SET title = ?, content = ?, category = ?
       WHERE announcement_id = ?`,
      [title, content, category, announcementId]
    );

    return result.affectedRows > 0;
  },

  /**
   * Delete an announcement
   */
  async delete(announcementId) {
    const [result] = await db.execute(
      `DELETE FROM ANNOUNCEMENT
       WHERE announcement_id = ?`,
      [announcementId]
    );

    return result.affectedRows > 0;
  },
};

module.exports = Announcement;