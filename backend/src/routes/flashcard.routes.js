const express = require('express');
const router = express.Router();
const flashcardController = require('../controllers/flashcard.controller');
const { authenticateToken } = require('../../middleware/auth.middleware');

router.post('/generate', authenticateToken, flashcardController.generateFlashcards);
router.get('/', authenticateToken, flashcardController.getMyFlashcardSets);
router.get('/:id', authenticateToken, flashcardController.getFlashcardSet);
router.delete('/:id', authenticateToken, flashcardController.deleteFlashcardSet);

module.exports = router;