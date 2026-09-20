const db = require('../../config/db');

const Flashcard = {
  async createSetWithCards({ userId, moduleId, documentId, title, cards }) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [setResult] = await connection.execute(
        `INSERT INTO FLASHCARD_SET (user_id, module_id, document_id, title, created_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [userId, moduleId, documentId || null, title]
      );

      const flashcardSetId = setResult.insertId;

      if (cards && cards.length > 0) {
        const values = cards.map((card, index) => [
          flashcardSetId,
          index + 1,
          card.front,
          card.back,
          new Date(),
        ]);

        await connection.query(
          `INSERT INTO FLASHCARD (flashcard_set_id, card_order, front_text, back_text, created_at)
           VALUES ?`,
          [values]
        );
      }

      await connection.commit();
      return flashcardSetId;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  async getSetById(flashcardSetId, userId) {
    const [sets] = await db.execute(
      `SELECT fs.*, d.title AS document_title
       FROM FLASHCARD_SET fs
       LEFT JOIN DOCUMENT d ON fs.document_id = d.document_id
       WHERE fs.flashcard_set_id = ? AND fs.user_id = ?`,
      [flashcardSetId, userId]
    );

    if (sets.length === 0) return null;

    const [cards] = await db.execute(
      `SELECT flashcard_id, card_order, front_text, back_text, created_at
       FROM FLASHCARD
       WHERE flashcard_set_id = ?
       ORDER BY card_order ASC`,
      [flashcardSetId]
    );

    return {
      ...sets[0],
      cards,
    };
  },

  async getSetsByUser(userId, moduleId = null) {
    let query = `
      SELECT fs.flashcard_set_id, fs.title, fs.module_id, fs.document_id,
             fs.created_at, m.module_name, d.title AS document_title,
             (SELECT COUNT(*) FROM FLASHCARD f WHERE f.flashcard_set_id = fs.flashcard_set_id) AS card_count
      FROM FLASHCARD_SET fs
      LEFT JOIN MODULE m ON fs.module_id = m.module_id
      LEFT JOIN DOCUMENT d ON fs.document_id = d.document_id
      WHERE fs.user_id = ?
    `;
    const params = [userId];

    if (moduleId) {
      query += ` AND fs.module_id = ?`;
      params.push(moduleId);
    }

    query += ` ORDER BY fs.created_at DESC`;

    const [rows] = await db.execute(query, params);
    return rows;
  },

  async deleteSet(flashcardSetId, userId) {
    const [result] = await db.execute(
      `DELETE FROM FLASHCARD_SET WHERE flashcard_set_id = ? AND user_id = ?`,
      [flashcardSetId, userId]
    );
    return result.affectedRows > 0;
  },
};

module.exports = Flashcard;