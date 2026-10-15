
const db = require('../config/db');

const WEEKLY_AI_LIMIT = 20;

function getUserScope(user) {
  return {
    isAdmin: user.role === 'admin',
    userId: user.user_id,
  };
}

async function getDashboardData(user) {
  const { isAdmin, userId } = getUserScope(user);
  

  // 1. Active modules
  // Students see modules linked to their cohort.
  // Admins can see all modules.
  const moduleParams = isAdmin ? [] : [userId];

  const [moduleRows] = await db.query(
    isAdmin
      ? `SELECT
           m.module_id,
           m.module_code,
           m.module_name,
           MIN(c.cohort_id) AS cohort_id,
           MIN(c.cohort_name) AS cohort_name
         FROM MODULE m
         LEFT JOIN COHORT_MODULE cm
           ON cm.module_id = m.module_id
         LEFT JOIN COHORT c
           ON c.cohort_id = cm.cohort_id
         GROUP BY
           m.module_id,
           m.module_code,
           m.module_name
         ORDER BY m.module_code`
      : `SELECT
           m.module_id,
           m.module_code,
           m.module_name,
           c.cohort_id,
           c.cohort_name
         FROM \`USER\` u
         JOIN COHORT_MODULE cm
           ON cm.cohort_id = u.cohort_id
         JOIN MODULE m
           ON m.module_id = cm.module_id
         JOIN COHORT c
           ON c.cohort_id = cm.cohort_id
         WHERE u.user_id = ?
         ORDER BY m.module_code`,
    moduleParams
  );

  // 2. Upcoming deadlines
  const deadlineParams = isAdmin ? [] : [userId];

  const [deadlineRows] = await db.query(
    `SELECT
       d.deadline_id,
       d.title,
       d.due_at,
       d.item_type,
       m.module_name
     FROM DASHBOARD_DEADLINE d
     LEFT JOIN MODULE m
       ON m.module_id = d.module_id
     WHERE ${isAdmin ? '1 = 1' : 'd.user_id = ?'}
       AND d.due_at >= NOW()
     ORDER BY d.due_at ASC`,
    deadlineParams
  );

  // 3. Recent documents
  const documentParams = isAdmin ? [] : [userId];

  const [documentRows] = await db.query(
    `SELECT
       d.document_id,
       d.file_name,
       d.file_size_bytes,
       d.file_type,
       d.uploaded_at,
       d.accessed_at,
       m.module_name
     FROM DASHBOARD_DOCUMENT d
     LEFT JOIN MODULE m
       ON m.module_id = d.module_id
     ${isAdmin ? '' : 'WHERE d.user_id = ?'}
     ORDER BY COALESCE(d.accessed_at, d.uploaded_at) DESC
     LIMIT 10`,
    documentParams
  );

  // 4. AI questions this week
  const aiParams = isAdmin ? [] : [userId];

  const [aiRows] = await db.query(
    `SELECT COUNT(*) AS question_count
     FROM AI_CHAT_USAGE
     WHERE created_at >= DATE_SUB(
       CURDATE(),
       INTERVAL WEEKDAY(CURDATE()) DAY
     )
     ${isAdmin ? '' : 'AND user_id = ?'}`,
    aiParams
  );

  // 5. Announcements
// Admins see all announcements.
// Students see campus-wide announcements and announcements
// for modules linked to their cohort.
const announcementParams = isAdmin ? [] : [userId];

const [announcementRows] = await db.query(
  `SELECT
      a.announcement_id,
      a.title,
      a.content,
      a.category,
      a.created_at,
      m.module_name
   FROM ANNOUNCEMENT a
   LEFT JOIN MODULE m
     ON m.module_id = a.module_id
   ${
     isAdmin
       ? ''
       : `WHERE a.module_id IS NULL
            OR EXISTS (
              SELECT 1
              FROM \`USER\` u
              JOIN COHORT_MODULE cm
                ON cm.cohort_id = u.cohort_id
              WHERE u.user_id = ?
                AND cm.module_id = a.module_id
            )`
   }
   ORDER BY a.created_at DESC
   LIMIT 10`,
  announcementParams
);

  // 6. Prepare dashboard response
  const cohortCount = new Set(
    moduleRows
      .map((module) => module.cohort_id)
      .filter(Boolean)
  ).size;

  
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
