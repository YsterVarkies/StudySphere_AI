const Quiz = require('../models/quiz.model');
const aiService = require('../service/ai.service');
const db = require('../../config/db');

function getUserId(req) {
  return req.user?.user_id || req.user?.id || Number(req.body.userId) || Number(req.query.userId) || null;
}

exports.generateQuiz = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { documentId, moduleId, title } = req.body;
    const numberOfQuestions = Math.min(Math.max(Number(req.body.numberOfQuestions) || 5, 1), 20);

    if (!documentId || !moduleId) {
      return res.status(400).json({
        success: false,
        message: 'documentId and moduleId are required',
      });
    }

    const [docs] = await db.execute(
      `SELECT document_id, title FROM DOCUMENT
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
        `SELECT extracted_text FROM DOCUMENT_TEXT WHERE document_id = ?`,
        [documentId]
      );
      studyText = textRows[0]?.extracted_text || '';
    } catch (e) {
      console.error('Could not load document text:', e.message);
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
      console.error('AI quiz failed:', aiError.message);
      return res.status(502).json({
        success: false,
        message: 'Failed to generate quiz from AI service',
        error: aiError.message,
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

exports.getQuizzes = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const quizzes = await Quiz.getByUser(userId, req.query.moduleId || null);
    return res.json({ success: true, data: quizzes });
  } catch (error) {
    console.error('getQuizzes error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch quizzes' });
  }
};

exports.getQuizById = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const quiz = await Quiz.getById(parseInt(req.params.id, 10), userId);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    return res.json({ success: true, data: quiz });
  } catch (error) {
    console.error('getQuizById error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch quiz' });
  }
};

exports.deleteQuiz = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const deleted = await Quiz.delete(parseInt(req.params.id, 10), userId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    return res.json({ success: true, message: 'Quiz deleted successfully' });
  } catch (error) {
    console.error('deleteQuiz error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete quiz' });
  }
};

exports.submitAttempt = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

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
    const attemptId = await Quiz.saveAttempt({ quizId, userId, answers, score });

    return res.status(201).json({
      success: true,
      message: 'Attempt submitted',
      data: { attemptId, score, correct, total },
    });
  } catch (error) {
    console.error('submitAttempt error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit attempt' });
  }
};

exports.getAttempts = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const attempts = await Quiz.getAttempts(parseInt(req.params.id, 10), userId);
    return res.json({ success: true, data: attempts });
  } catch (error) {
    console.error('getAttempts error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch attempts' });
  }
};