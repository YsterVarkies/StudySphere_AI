const db = require('../config/db');

const WEEKLY_AI_LIMIT = 20;

function getUserScope(user) {
  return user.role === 'admin' ? { isAdmin: true, userId: user.user_id } : { isAdmin: false, userId: user.user_id };
}

async function getDashboardData(user) {
  const { isAdmin, userId } = getUserScope(user);
  const moduleWhere = isAdmin ? '' : 'WHERE um.user_id = ?';
  const moduleParams = isAdmin ? [] : [userId];

  const [moduleRows] = await db.query(
    `SELECT m.module_id, m.module_code, m.module_name, MIN(c.cohort_id) AS cohort_id, MIN(c.cohort_name) AS cohort_name
     FROM \`MODULE\` m
     ${isAdmin
       ? 'LEFT JOIN USER_MODULE um ON um.module_id = m.module_id LEFT JOIN COHORT c ON c.cohort_id = um.cohort_id'
       : 'INNER JOIN USER_MODULE um ON um.module_id = m.module_id LEFT JOIN COHORT c ON c.cohort_id = um.cohort_id'}
     ${moduleWhere}
    GROUP BY m.module_id, m.module_code, m.module_name
     ORDER BY m.module_code`,
    moduleParams
  );

  const deadlineParams = isAdmin ? [] : [userId];
  const [deadlineRows] = await db.query(
    `SELECT d.deadline_id, d.title, d.due_at, d.item_type, m.module_name
     FROM DASHBOARD_DEADLINE d
     LEFT JOIN MODULE m ON m.module_id = d.module_id
     WHERE ${isAdmin ? '1 = 1' : 'd.user_id = ?'}
       AND d.due_at >= NOW()
     ORDER BY d.due_at ASC`,
    deadlineParams
  );

  const documentParams = isAdmin ? [] : [userId];
  const [documentRows] = await db.query(
    `SELECT d.document_id, d.file_name, d.file_size_bytes, d.file_type, d.uploaded_at, d.accessed_at,
            m.module_name
     FROM DASHBOARD_DOCUMENT d
     LEFT JOIN MODULE m ON m.module_id = d.module_id
     ${isAdmin ? '' : 'WHERE d.user_id = ?'}
     ORDER BY COALESCE(d.accessed_at, d.uploaded_at) DESC
     LIMIT 10`,
    documentParams
  );

  const aiParams = isAdmin ? [] : [userId];
  const [aiRows] = await db.query(
    `SELECT COUNT(*) AS question_count
     FROM AI_CHAT_USAGE
     WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
       ${isAdmin ? '' : 'AND user_id = ?'}`,
    aiParams
  );

  const [announcementRows] = await db.query(
    `SELECT a.announcement_id, a.title, a.content, a.created_at, m.module_name,
            CASE WHEN a.module_id IS NULL THEN 'Campus-wide' ELSE m.module_name END AS category
     FROM ANNOUNCEMENT a
     LEFT JOIN MODULE m ON m.module_id = a.module_id
     ${isAdmin ? '' : `WHERE a.module_id IS NULL OR EXISTS (
       SELECT 1 FROM USER_MODULE um WHERE um.user_id = ? AND um.module_id = a.module_id
     )`}
     ORDER BY a.created_at DESC
     LIMIT 10`,
    isAdmin ? [] : [userId]
  );

  const cohortCount = new Set(moduleRows.map((module) => module.cohort_id).filter(Boolean)).size;
  const activeModules = moduleRows.map((module) => ({
    id: module.module_id,
    code: module.module_code,
    name: module.module_name,
    cohort: module.cohort_name,
  }));

  return {
    activeModules: {
      count: activeModules.length,
      cohortCount,
      items: activeModules,
    },
    upcomingDeadlines: {
      count: deadlineRows.length,
      items: deadlineRows.map((deadline) => ({
        id: deadline.deadline_id,
        title: deadline.title,
        module: deadline.module_name,
        dueAt: deadline.due_at,
        type: deadline.item_type,
      })),
    },
    aiQuestionsThisWeek: {
      count: Number(aiRows[0]?.question_count || 0),
      weeklyLimit: WEEKLY_AI_LIMIT,
    },
    recentDocuments: documentRows.map((document) => ({
      id: document.document_id,
      fileName: document.file_name,
      module: document.module_name,
      fileSizeBytes: Number(document.file_size_bytes),
      fileType: document.file_type,
      uploadedAt: document.uploaded_at,
      accessedAt: document.accessed_at,
    })),
    announcements: announcementRows.map((announcement) => ({
      id: announcement.announcement_id,
      title: announcement.title,
      message: announcement.content,
      category: announcement.category,
      publishedAt: announcement.created_at,
    })),
  };
}

module.exports = {
  getDashboardData,
};
