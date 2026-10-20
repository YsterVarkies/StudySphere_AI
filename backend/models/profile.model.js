const db = require('../config/db');

const Profile = {
  async getById(userId) {
    const [rows] = await db.execute(
      `SELECT
         user_id,
         first_name,
         last_name,
         email,
         role,
         cohort_id,
         student_number
       FROM USER
       WHERE user_id = ?
       LIMIT 1`,
      [userId]
    );
    return rows[0] || null;
  },

  async updateProfile(userId, data) {
    const {
      first_name,
      last_name,
      email,
      cohort_id,
      student_number,
    } = data;

    const [result] = await db.execute(
      `UPDATE USER
       SET
         first_name = ?,
         last_name = ?,
         email = ?,
         cohort_id = ?,
         student_number = ?
       WHERE user_id = ?`,
      [
        first_name,
        last_name,
        email,
        cohort_id || null,
        student_number || null,
        userId,
      ]
    );

    return result.affectedRows > 0;
  },

  async emailTakenByOther(email, userId) {
    const [rows] = await db.execute(
      `SELECT user_id FROM USER WHERE email = ? AND user_id <> ? LIMIT 1`,
      [email, userId]
    );
    return rows.length > 0;
  },
};

module.exports = Profile;