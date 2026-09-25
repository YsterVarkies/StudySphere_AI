const db = require('../../config/db');

const Quiz = {
  async createWithQuestions({ userId, moduleId, documentId, title, questions }) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [quizResult] = await connection.execute(
        `INSERT INTO quiz (user_id, module_id, document_id, title, created_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [userId, moduleId, documentId || null, title]
      );

      const quizId = quizResult.insertId;

      if (questions && questions.length > 0) {
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          await connection.execute(
            `INSERT INTO quiz_question
             (quiz_id, question_order, question_text, options_json, correct_answer, explanation)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              quizId,
              i + 1,
              q.question,
              JSON.stringify(q.options || []),
              q.correctAnswer || q.correct_answer || '',
              q.explanation || null,
            ]
          );
        }
      }

      await connection.commit();
      return quizId;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  async getById(quizId, userId) {
    const [quizzes] = await db.execute(
      `SELECT q.*, d.title AS document_title, m.module_name
       FROM quiz q
       LEFT JOIN document d ON q.document_id = d.document_id
       LEFT JOIN module m ON q.module_id = m.module_id
       WHERE q.quiz_id = ? AND q.user_id = ?`,
      [quizId, userId]
    );

    if (quizzes.length === 0) return null;

    const [questions] = await db.execute(
      `SELECT question_id, question_order, question_text, options_json, correct_answer, explanation
       FROM quiz_question
       WHERE quiz_id = ?
       ORDER BY question_order ASC`,
      [quizId]
    );

    const parsedQuestions = questions.map((q) => ({
      ...q,
      options: typeof q.options_json === 'string' ? JSON.parse(q.options_json) : q.options_json,
    }));

    return {
      ...quizzes[0],
      questions: parsedQuestions,
    };
  },

  async getByUser(userId, moduleId = null) {
    let query = `
      SELECT q.quiz_id, q.title, q.module_id, q.document_id, q.created_at,
             m.module_name, d.title AS document_title,
             (SELECT COUNT(*) FROM quiz_question qq WHERE qq.quiz_id = q.quiz_id) AS question_count
      FROM QUIZ q
      LEFT JOIN module m ON q.module_id = m.module_id
      LEFT JOIN document d ON q.document_id = d.document_id
      WHERE q.user_id = ?
    `;
    const params = [userId];

    if (moduleId) {
      query += ` AND q.module_id = ?`;
      params.push(moduleId);
    }

    query += ` ORDER BY q.created_at DESC`;

    const [rows] = await db.execute(query, params);
    return rows;
  },

  async delete(quizId, userId) {
    const [result] = await db.execute(
      `DELETE FROM QUIZ WHERE quiz_id = ? AND user_id = ?`,
      [quizId, userId]
    );
    return result.affectedRows > 0;
  },

  async saveAttempt({ quizId, userId, answers, score }) {
    const [result] = await db.execute(
      `INSERT INTO quiz_attempt (quiz_id, user_id, answers_json, score, started_at, completed_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [quizId, userId, JSON.stringify(answers || {}), score]
    );
    return result.insertId;
  },

  async getAttempts(quizId, userId) {
    const [rows] = await db.execute(
      `SELECT attempt_id, answers_json, score, started_at, completed_at
       FROM quiz_attempt
       WHERE quiz_id = ? AND user_id = ?
       ORDER BY completed_at DESC`,
      [quizId, userId]
    );
    return rows.map((r) => ({
      ...r,
      answers: typeof r.answers_json === 'string' ? JSON.parse(r.answers_json) : r.answers_json,
    }));
  },
};

module.exports = Quiz;