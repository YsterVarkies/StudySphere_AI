const express = require('express');
const router = express.Router();
const flashcardController = require('../controllers/flashcard.controller');
// const { authenticate } = require('../middleware/auth.middleware'); // TEMP: disabled

// router.use(authenticate); // TEMP: commented out for testing

router.post('/generate', flashcardController.generateFlashcards);
router.get('/', flashcardController.getMyFlashcardSets);
router.get('/:id', flashcardController.getFlashcardSet);
router.delete('/:id', flashcardController.deleteFlashcardSet);

module.exports = router;