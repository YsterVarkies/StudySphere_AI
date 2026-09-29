const db = require('../../config/db');

const Quiz = {
  async createWithQuestions({ userId, moduleId, documentId, title, questions }) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const [quizResult] = await connection.execute(
        `INSERT INTO QUIZ
         (user_id, module_id, document_id, title, created_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [userId, moduleId, documentId || null, title]
      );

      const quizId = quizResult.insertId;

      if (Array.isArray(questions) && questions.length > 0) {
        for (let i = 0; i < questions.length; i++) {
          const question = questions[i];

          const questionText =
            question.question ||
            question.text ||
            question.prompt ||
            '';

          const options = Array.isArray(question.options)
            ? question.options
            : Array.isArray(question.choices)
              ? question.choices
              : [];

          const correctAnswer =
            question.correct_answer ||
            question.correctAnswer ||
            question.correct_option ||
            question.correctOption ||
            '';

          const explanation =
            question.explanation ||
            null;

          if (!questionText.trim()) {
            throw new Error(`Question ${i + 1} has no question text`);
          }

          if (options.length === 0) {
            throw new Error(`Question ${i + 1} has no options`);
          }

          await connection.execute(
            `INSERT INTO QUIZ_QUESTION
             (
               quiz_id,
               question_order,
               question_text,
               options_json,
               correct_answer,
               explanation
             )
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              quizId,
              i + 1,
              questionText,
              JSON.stringify(options),
              correctAnswer,
              explanation
            ]
          );
        }
      }

      await connection.commit();

      return quizId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async getById(quizId, userId) {
    const [quizzes] = await db.execute(
      `SELECT
         q.*,
         d.title AS document_title,
         m.module_name
       FROM QUIZ q
       LEFT JOIN DOCUMENT d
         ON q.document_id = d.document_id
       LEFT JOIN MODULE m
         ON q.module_id = m.module_id
       WHERE q.quiz_id = ?
         AND q.user_id = ?`,
      [quizId, userId]
    );

    if (quizzes.length === 0) {
      return null;
    }

    const [questions] = await db.execute(
      `SELECT
         question_id,
         question_order,
         question_text,
         options_json,
         correct_answer,
         explanation
       FROM QUIZ_QUESTION
       WHERE quiz_id = ?
       ORDER BY question_order ASC`,
      [quizId]
    );

    const parsedQuestions = questions.map((question) => {
      let options = [];

      try {
        if (typeof question.options_json === 'string') {
          options = JSON.parse(question.options_json);
        } else if (Array.isArray(question.options_json)) {
          options = question.options_json;
        }
      } catch (error) {
        options = [];
      }

      return {
        question_id: question.question_id,
        question_order: question.question_order,
        question: question.question_text,
        text: question.question_text,
        options: options,
        correct_answer: question.correct_answer,
        correctAnswer: question.correct_answer,
        explanation: question.explanation
      };
    });

    return {
      ...quizzes[0],
      questions: parsedQuestions
    };
  },

  async getByUser(userId, moduleId = null) {
    let query = `
      SELECT
        q.quiz_id,
        q.title,
        q.module_id,
        q.document_id,
        q.created_at,
        m.module_name,
        d.title AS document_title,
        (
          SELECT COUNT(*)
          FROM QUIZ_QUESTION qq
          WHERE qq.quiz_id = q.quiz_id
        ) AS question_count
      FROM QUIZ q
      LEFT JOIN MODULE m
        ON q.module_id = m.module_id
      LEFT JOIN DOCUMENT d
        ON q.document_id = d.document_id
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
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const [quizResult] = await connection.execute(
        `DELETE FROM QUIZ
         WHERE quiz_id = ?
           AND user_id = ?`,
        [quizId, userId]
      );

      await connection.commit();

      return quizResult.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async saveAttempt({ quizId, userId, answers, score }) {
    const [result] = await db.execute(
      `INSERT INTO QUIZ_ATTEMPT
       (
         quiz_id,
         user_id,
         answers_json,
         score,
         started_at,
         completed_at
       )
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [
        quizId,
        userId,
        JSON.stringify(answers || {}),
        score
      ]
    );

    return result.insertId;
  },

  async getAttempts(quizId, userId) {
    const [rows] = await db.execute(
      `SELECT
         attempt_id,
         answers_json,
         score,
         started_at,
         completed_at
       FROM QUIZ_ATTEMPT
       WHERE quiz_id = ?
         AND user_id = ?
       ORDER BY completed_at DESC`,
      [quizId, userId]
    );

    return rows.map((row) => {
      let answers = {};

      try {
        if (typeof row.answers_json === 'string') {
          answers = JSON.parse(row.answers_json);
        } else if (row.answers_json) {
          answers = row.answers_json;
        }
      } catch (error) {
        answers = {};
      }

      return {
        ...row,
        answers
      };
    });
  }
};

module.exports = Quiz;