const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quiz.controller');

router.post('/generate', quizController.generateQuiz);
router.get('/', quizController.getQuizzes);
router.get('/:id', quizController.getQuizById);
router.delete('/:id', quizController.deleteQuiz);
router.post('/:id/attempt', quizController.submitAttempt);
router.get('/:id/attempts', quizController.getAttempts);

module.exports = router;