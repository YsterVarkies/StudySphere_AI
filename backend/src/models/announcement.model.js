const db = require('../../config/db');

const Announcement = {
  async create({ moduleId, createdByUserId, title, content }) {
    const [result] = await db.execute(
      `INSERT INTO ANNOUNCEMENT
         (module_id, created_by_user_id, title, content, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [moduleId || null, createdByUserId, title, content]
    );
    return result.insertId;
  },

  async getById(announcementId) {
    const [rows] = await db.execute(
      `SELECT
         a.*,
         u.first_name,
         u.last_name,
         m.module_code,
         m.module_name
       FROM ANNOUNCEMENT a
       LEFT JOIN USER u ON a.created_by_user_id = u.user_id
       LEFT JOIN MODULE m ON a.module_id = m.module_id
       WHERE a.announcement_id = ?`,
      [announcementId]
    );
    return rows[0] || null;
  },

  async getAll(moduleId = undefined) {
    let query = `
      SELECT
        a.*,
        u.first_name,
        u.last_name,
        m.module_code,
        m.module_name
      FROM ANNOUNCEMENT a
      LEFT JOIN USER u ON a.created_by_user_id = u.user_id
      LEFT JOIN MODULE m ON a.module_id = m.module_id
    `;
    const params = [];

    if (moduleId === null) {
      query += ` WHERE a.module_id IS NULL`;
    } else if (moduleId !== undefined && moduleId !== '') {
      query += ` WHERE a.module_id = ?`;
      params.push(moduleId);
    }

    query += ` ORDER BY a.created_at DESC`;

    const [rows] = await db.execute(query, params);
    return rows;
  },

  async getForStudent(moduleIds = []) {
    const ids = (moduleIds || []).map(Number).filter(Boolean);

    if (ids.length === 0) {
      const [rows] = await db.execute(
        `SELECT
           a.*,
           u.first_name,
           u.last_name,
           m.module_code,
           m.module_name
         FROM ANNOUNCEMENT a
         LEFT JOIN USER u ON a.created_by_user_id = u.user_id
         LEFT JOIN MODULE m ON a.module_id = m.module_id
         WHERE a.module_id IS NULL
         ORDER BY a.created_at DESC`
      );
      return rows;
    }

    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await db.execute(
      `SELECT
         a.*,
         u.first_name,
         u.last_name,
         m.module_code,
         m.module_name
       FROM ANNOUNCEMENT a
       LEFT JOIN USER u ON a.created_by_user_id = u.user_id
       LEFT JOIN MODULE m ON a.module_id = m.module_id
       WHERE a.module_id IS NULL
          OR a.module_id IN (${placeholders})
       ORDER BY a.created_at DESC`,
      ids
    );
    return rows;
  },

  async update(announcementId, { title, content, moduleId }) {
    const [result] = await db.execute(
      `UPDATE ANNOUNCEMENT
       SET title = ?, content = ?, module_id = ?
       WHERE announcement_id = ?`,
      [
        title,
        content,
        moduleId === undefined ? null : moduleId || null,
        announcementId,
      ]
    );
    return result.affectedRows > 0;
  },

  async delete(announcementId) {
    const [result] = await db.execute(
      `DELETE FROM ANNOUNCEMENT WHERE announcement_id = ?`,
      [announcementId]
    );
    return result.affectedRows > 0;
  },
};

module.exports = Announcement;