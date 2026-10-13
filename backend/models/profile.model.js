const db = require('../config/db');

const Profile = {
  async updateProfile(userId, data) {
    const {
      first_name,
      last_name,
      email,
      cohort_id,
    } = data;

    const [result] = await db.execute(
      `UPDATE USER
       SET
         first_name = ?,
         last_name = ?,
         email = ?,
         cohort_id = ?
       WHERE user_id = ?`,
      [
        first_name,
        last_name,
        email,
        cohort_id || null,
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