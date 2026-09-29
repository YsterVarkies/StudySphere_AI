const Analytics = require('../models/analytics.model');

function getUserId(req) {
  return req.user?.user_id || req.user?.id || Number(req.body.userId) || Number(req.query.userId) || null;
}

exports.getOverview = async (req, res) => {
  try {
    const data = await Analytics.getOverview();
    return res.json({ success: true, data });
  } catch (error) {
    console.error('getOverview error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch analytics overview' });
  }
};

exports.getModuleEngagement = async (req, res) => {
  try {
    const data = await Analytics.getModuleEngagement();
    return res.json({ success: true, data });
  } catch (error) {
    console.error('getModuleEngagement error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch module engagement' });
  }
};

exports.getRecentLogs = async (req, res) => {
  try {
    const data = await Analytics.getRecentLogs(req.query.limit || 20);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('getRecentLogs error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch activity logs' });
  }
};

exports.getActivityTrend = async (req, res) => {
  try {
    const data = await Analytics.getActivityTrend(req.query.days || 7);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('getActivityTrend error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch activity trend' });
  }
};

exports.getTopUsers = async (req, res) => {
  try {
    const data = await Analytics.getTopUsers(req.query.limit || 10);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('getTopUsers error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch top users' });
  }
};

exports.createLog = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { activityType, relatedEntityType, relatedEntityId, description, logLevel } = req.body;

    if (!activityType) {
      return res.status(400).json({ success: false, message: 'activityType is required' });
    }

    const id = await Analytics.logActivity({
      userId,
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
    return res.status(500).json({ success: false, message: 'Failed to log activity' });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const overview = await Analytics.getOverview();
    const modules = await Analytics.getModuleEngagement();
    const recentLogs = await Analytics.getRecentLogs(5);
    const trend = await Analytics.getActivityTrend(7);

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
    });
  }
};