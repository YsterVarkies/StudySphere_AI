const express = require('express');
const router = express.Router();
const summaryController = require('../controllers/summary.controller');

router.post('/generate', summaryController.generateSummary);
router.get('/', summaryController.getSummaries);
router.get('/:id', summaryController.getSummaryById);
router.delete('/:id', summaryController.deleteSummary);

module.exports = router;