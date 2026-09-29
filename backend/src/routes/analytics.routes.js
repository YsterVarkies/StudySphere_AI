const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { authenticateToken } = require('../../middleware/auth.middleware');

router.get('/', authenticateToken, analyticsController.getDashboard);
router.get('/overview', authenticateToken, analyticsController.getOverview);
router.get('/modules', authenticateToken, analyticsController.getModuleEngagement);
router.get('/logs', authenticateToken, analyticsController.getRecentLogs);
router.get('/trend', authenticateToken, analyticsController.getActivityTrend);
router.get('/top-users', authenticateToken, analyticsController.getTopUsers);
router.post('/log', authenticateToken, analyticsController.createLog);

module.exports = router;