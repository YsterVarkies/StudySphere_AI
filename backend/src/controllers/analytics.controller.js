const Analytics = require('../models/analytics.model');

/**
 * GET /api/analytics/overview
 */
exports.getOverview = async (req, res) => {
  try {
    const data = await Analytics.getOverview();
    return res.json({ success: true, data });
  } catch (error) {
    console.error('getOverview error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics overview',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * GET /api/analytics/modules
 */
exports.getModuleEngagement = async (req, res) => {
  try {
    const data = await Analytics.getModuleEngagement();
    return res.json({ success: true, data });
  } catch (error) {
    console.error('getModuleEngagement error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch module engagement',
    });
  }
};

/**
 * GET /api/analytics/logs?limit=20
 */
exports.getRecentLogs = async (req, res) => {
  try {
    const limit = req.query.limit || 20;
    const data = await Analytics.getRecentLogs(limit);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('getRecentLogs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch activity logs',
    });
  }
};

/**
 * GET /api/analytics/trend?days=7
 */
exports.getActivityTrend = async (req, res) => {
  try {
    const days = req.query.days || 7;
    const data = await Analytics.getActivityTrend(days);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('getActivityTrend error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch activity trend',
    });
  }
};

/**
 * GET /api/analytics/top-users?limit=10
 */
exports.getTopUsers = async (req, res) => {
  try {
    const limit = req.query.limit || 10;
    const data = await Analytics.getTopUsers(limit);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('getTopUsers error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch top users',
    });
  }
};

/**
 * POST /api/analytics/log
 * Body: { userId?, activityType, relatedEntityType?, relatedEntityId?, description?, logLevel? }
 */
exports.createLog = async (req, res) => {
  try {
    const {
      userId,
      activityType,
      relatedEntityType,
      relatedEntityId,
      description,
      logLevel,
    } = req.body;

    if (!activityType) {
      return res.status(400).json({
        success: false,
        message: 'activityType is required',
      });
    }

    const id = await Analytics.logActivity({
      userId: userId || null,
      activityType,
      relatedEntityType,
      relatedEntityId,
      description,
      logLevel: logLevel || 'info',
    });

    return res.status(201).json({
      success: true,
      message: 'Activity logged',
      data: { activityId: id },
    });
  } catch (error) {
    console.error('createLog error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to log activity',
    });
  }
};

/**
 * GET /api/analytics
 * Combined dashboard payload (matches your admin frontend shape)
 */
exports.getDashboard = async (req, res) => {
  try {
    const overview = await Analytics.getOverview();
    const modules = await Analytics.getModuleEngagement();
    const recentLogs = await Analytics.getRecentLogs(5);
    const trend = await Analytics.getActivityTrend(7);

    // Shape similar to your existing /api/analytics response
    const activeModules = modules.slice(0, 4).map((m, index) => {
      const score =
        (m.documents || 0) * 2 +
        (m.quizzes || 0) * 3 +
        (m.flashcard_sets || 0) * 2 +
        (m.chat_sessions || 0);
      return {
        name: m.module_name,
        percentage: Math.min(100, 40 + score * 5 + index),
      };
    });

    return res.json({
      success: true,
      activeUsers: overview.activeUsers,
      modulesLive: overview.totalModules,
      aiRequestsToday: overview.activityLast24h,
      systemErrors: overview.errorsLast24h,
      activeModules,
      recentLogs: recentLogs.map((l) => ({
        type: l.activity_type || 'System',
        message: l.description || 'User activity recorded',
        time: l.created_at,
      })),
      overview,
      modules,
      trend,
    });
  } catch (error) {
    console.error('getDashboard error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};