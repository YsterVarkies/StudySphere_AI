const db = require('../../config/db');

const Analytics = {
  async logActivity({
    userId,
    activityType,
    relatedEntityType = null,
    relatedEntityId = null,
    description = null,
    logLevel = 'info',
  }) {
    const [result] = await db.execute(
      `INSERT INTO USER_ACTIVITY_LOG
       (user_id, activity_type, related_entity_type, related_entity_id, description, log_level, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [userId || null, activityType, relatedEntityType, relatedEntityId, description, logLevel]
    );
    return result.insertId;
  },

  async getOverview() {
    const [users] = await db.execute(
      `SELECT COUNT(*) AS total_users,
              SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active_users
       FROM USER`
    );

    const [modules] = await db.execute(`SELECT COUNT(*) AS total_modules FROM MODULE`);
    const [documents] = await db.execute(`SELECT COUNT(*) AS total_documents FROM DOCUMENT`);
    const [quizzes] = await db.execute(`SELECT COUNT(*) AS total_quizzes FROM QUIZ`);
    const [flashcards] = await db.execute(`SELECT COUNT(*) AS total_flashcard_sets FROM FLASHCARD_SET`);
    const [summaries] = await db.execute(`SELECT COUNT(*) AS total_summaries FROM SUMMARY`);
    const [chatSessions] = await db.execute(`SELECT COUNT(*) AS total_chat_sessions FROM CHAT_SESSION`);
    const [announcements] = await db.execute(`SELECT COUNT(*) AS total_announcements FROM ANNOUNCEMENT`);

    const [recentActivity] = await db.execute(
      `SELECT COUNT(*) AS activity_last_24h
       FROM USER_ACTIVITY_LOG
       WHERE created_at >= NOW() - INTERVAL 1 DAY`
    );

    const [errors] = await db.execute(
      `SELECT COUNT(*) AS errors_last_24h
       FROM USER_ACTIVITY_LOG
       WHERE log_level = 'error'
         AND created_at >= NOW() - INTERVAL 1 DAY`
    );

    return {
      totalUsers: users[0].total_users || 0,
      activeUsers: users[0].active_users || 0,
      totalModules: modules[0].total_modules || 0,
      totalDocuments: documents[0].total_documents || 0,
      totalQuizzes: quizzes[0].total_quizzes || 0,
      totalFlashcardSets: flashcards[0].total_flashcard_sets || 0,
      totalSummaries: summaries[0].total_summaries || 0,
      totalChatSessions: chatSessions[0].total_chat_sessions || 0,
      totalAnnouncements: announcements[0].total_announcements || 0,
      activityLast24h: recentActivity[0].activity_last_24h || 0,
      errorsLast24h: errors[0].errors_last_24h || 0,
    };
  },

  async getModuleEngagement() {
    const [rows] = await db.execute(
      `SELECT
        m.module_id,
        m.module_code,
        m.module_name,
        (SELECT COUNT(*) FROM DOCUMENT d WHERE d.module_id = m.module_id) AS documents,
        (SELECT COUNT(*) FROM QUIZ q WHERE q.module_id = m.module_id) AS quizzes,
        (SELECT COUNT(*) FROM FLASHCARD_SET fs WHERE fs.module_id = m.module_id) AS flashcard_sets,
        (SELECT COUNT(*) FROM CHAT_SESSION cs WHERE cs.module_id = m.module_id) AS chat_sessions,
        (SELECT COUNT(*) FROM ANNOUNCEMENT a WHERE a.module_id = m.module_id) AS announcements
      FROM MODULE m
      ORDER BY documents DESC, quizzes DESC`
    );
    return rows;
  },

  async getRecentLogs(limit = 20) {
    const [rows] = await db.execute(
      `SELECT
        l.activity_id, l.user_id, l.activity_type, l.related_entity_type,
        l.related_entity_id, l.description, l.log_level, l.created_at,
        u.first_name, u.last_name, u.email
      FROM USER_ACTIVITY_LOG l
      LEFT JOIN USER u ON l.user_id = u.user_id
      ORDER BY l.created_at DESC
      LIMIT ?`,
      [Number(limit)]
    );
    return rows;
  },

  async getActivityTrend(days = 7) {
    const [rows] = await db.execute(
      `SELECT
        DATE(created_at) AS day,
        COUNT(*) AS total,
        SUM(CASE WHEN log_level = 'error' THEN 1 ELSE 0 END) AS errors
      FROM USER_ACTIVITY_LOG
      WHERE created_at >= NOW() - INTERVAL ? DAY
      GROUP BY DATE(created_at)
      ORDER BY day ASC`,
      [Number(days)]
    );
    return rows;
  },

  async getTopUsers(limit = 10) {
    const [rows] = await db.execute(
      `SELECT
        u.user_id, u.first_name, u.last_name, u.email, u.role,
        COUNT(l.activity_id) AS activity_count
      FROM USER u
      LEFT JOIN USER_ACTIVITY_LOG l ON u.user_id = l.user_id
      GROUP BY u.user_id, u.first_name, u.last_name, u.email, u.role
      ORDER BY activity_count DESC
      LIMIT ?`,
      [Number(limit)]
    );
    return rows;
  },
};

module.exports = Analytics;