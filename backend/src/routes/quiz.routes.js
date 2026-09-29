const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quiz.controller');
const { authenticateToken } = require('../../middleware/auth.middleware');

router.post('/generate', authenticateToken, quizController.generateQuiz);
router.get('/', authenticateToken, quizController.getQuizzes);
router.get('/:id', authenticateToken, quizController.getQuizById);
router.delete('/:id', authenticateToken, quizController.deleteQuiz);
router.post('/:id/attempt', authenticateToken, quizController.submitAttempt);
router.get('/:id/attempts', authenticateToken, quizController.getAttempts);

module.exports = router;