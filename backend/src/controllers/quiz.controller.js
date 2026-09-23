const Quiz = require('../models/quiz.model');
const aiService = require('../service/ai.service');
const db = require('../../config/db');

/**
 * POST /api/quizzes/generate
 * Body: { documentId, moduleId, userId?, numberOfQuestions?, title? }
 */
exports.generateQuiz = async (req, res) => {
  try {
    const userId = req.body.userId || req.query.userId || 1;
    const { documentId, moduleId, title, numberOfQuestions = 5 } = req.body;

    if (!documentId || !moduleId) {
      return res.status(400).json({
        success: false,
        message: 'documentId and moduleId are required',
      });
    }

    const [docs] = await db.execute(
      `SELECT document_id, title FROM document
       WHERE document_id = ? AND user_id = ? AND module_id = ?`,
      [documentId, userId, moduleId]
    );

    if (docs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document not found or access denied',
      });
    }

    const document = docs[0];

    let studyText = '';
    try {
      const [textRows] = await db.execute(
        `SELECT extracted_text FROM document_text WHERE document_id = ?`,
        [documentId]
      );
      studyText = textRows[0]?.extracted_text || '';
    } catch (e) {
      studyText = '';
    }

    if (!studyText || studyText.trim().length < 50) {
      return res.status(400).json({
        success: false,
        message: 'Not enough text content available for this document to generate a quiz',
      });
    }

    if (studyText.length > 12000) {
      studyText = studyText.substring(0, 12000) + '...';
    }

    let aiResult;
    try {
      aiResult = await aiService.generateQuiz(studyText, numberOfQuestions);
    } catch (aiError) {
      console.error('AI quiz failed:', aiError);
      return res.status(502).json({
        success: false,
        message: 'Failed to generate quiz from AI service',
        error: process.env.NODE_ENV === 'development' ? aiError.message : undefined,
      });
    }

    if (!aiResult?.questions || !Array.isArray(aiResult.questions) || aiResult.questions.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'AI returned invalid quiz format',
      });
    }

    const quizTitle = title || `Quiz – ${document.title}`;
    const quizId = await Quiz.createWithQuestions({
      userId,
      moduleId,
      documentId,
      title: quizTitle,
      questions: aiResult.questions,
    });

    const fullQuiz = await Quiz.getById(quizId, userId);

    return res.status(201).json({
      success: true,
      message: 'Quiz generated successfully',
      data: fullQuiz,
    });
  } catch (error) {
    console.error('generateQuiz error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while generating quiz',
    });
  }
};

/**
 * GET /api/quizzes?userId=1&moduleId=1
 */
exports.getQuizzes = async (req, res) => {
  try {
    const userId = req.query.userId || 1;
    const { moduleId } = req.query;

    const quizzes = await Quiz.getByUser(userId, moduleId || null);

    return res.json({
      success: true,
      data: quizzes,
    });
  } catch (error) {
    console.error('getQuizzes error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch quizzes' });
  }
};

/**
 * GET /api/quizzes/:id?userId=1
 */
exports.getQuizById = async (req, res) => {
  try {
    const userId = req.query.userId || 1;
    const quizId = parseInt(req.params.id, 10);

    const quiz = await Quiz.getById(quizId, userId);

    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    return res.json({
      success: true,
      data: quiz,
    });
  } catch (error) {
    console.error('getQuizById error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch quiz' });
  }
};

/**
 * DELETE /api/quizzes/:id?userId=1
 */
exports.deleteQuiz = async (req, res) => {
  try {
    const userId = req.query.userId || req.body.userId || 1;
    const quizId = parseInt(req.params.id, 10);

    const deleted = await Quiz.delete(quizId, userId);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    return res.json({
      success: true,
      message: 'Quiz deleted successfully',
    });
  } catch (error) {
    console.error('deleteQuiz error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete quiz' });
  }
};

/**
 * POST /api/quizzes/:id/attempt
 * Body: { userId?, answers: { "1": "A", "2": "B" } }
 */
exports.submitAttempt = async (req, res) => {
  try {
    const userId = req.body.userId || req.query.userId || 1;
    const quizId = parseInt(req.params.id, 10);
    const { answers } = req.body;

    const quiz = await Quiz.getById(quizId, userId);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    let correct = 0;
    const total = quiz.questions.length;

    quiz.questions.forEach((q) => {
      const userAnswer = answers?.[String(q.question_id)] || answers?.[q.question_order];
      if (userAnswer && String(userAnswer).toUpperCase() === String(q.correct_answer).toUpperCase()) {
        correct++;
      }
    });

    const score = total > 0 ? Number(((correct / total) * 100).toFixed(2)) : 0;

    const attemptId = await Quiz.saveAttempt({
      quizId,
      userId,
      answers,
      score,
    });

    return res.status(201).json({
      success: true,
      message: 'Attempt submitted',
      data: {
        attemptId,
        score,
        correct,
        total,
      },
    });
  } catch (error) {
    console.error('submitAttempt error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit attempt' });
  }
};

/**
 * GET /api/quizzes/:id/attempts?userId=1
 */
exports.getAttempts = async (req, res) => {
  try {
    const userId = req.query.userId || 1;
    const quizId = parseInt(req.params.id, 10);

    const attempts = await Quiz.getAttempts(quizId, userId);

    return res.json({
      success: true,
      data: attempts,
    });
  } catch (error) {
    console.error('getAttempts error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch attempts' });
  }
};