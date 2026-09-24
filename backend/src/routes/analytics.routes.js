const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');

router.get('/', analyticsController.getDashboard);
router.get('/overview', analyticsController.getOverview);
router.get('/modules', analyticsController.getModuleEngagement);
router.get('/logs', analyticsController.getRecentLogs);
router.get('/trend', analyticsController.getActivityTrend);
router.get('/top-users', analyticsController.getTopUsers);
router.post('/log', analyticsController.createLog);

module.exports = router;