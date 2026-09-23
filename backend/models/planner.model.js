const db = require("../config/db");

// Get all planner tasks for a user
const getPlannerTasksByUser = async (userId) => {
    const [rows] = await db.query(`
        SELECT
            st.task_id,
            st.user_id,
            st.module_id,
            m.module_code,
            m.module_name,
            st.assignment_id,
            st.title,
            st.description,
            st.task_type,
            st.scheduled_at,
            st.reminder_at,
            st.status,
            st.created_at
        FROM \`STUDY_TASK\` st
        INNER JOIN \`MODULE\` m
            ON st.module_id = m.module_id
        WHERE st.user_id = ?
        ORDER BY st.scheduled_at ASC
    `, [userId]);

    return rows;
};


// Get one planner task belonging to a user
const getPlannerTaskById = async (taskId, userId) => {
    const [rows] = await db.query(`
        SELECT
            st.task_id,
            st.user_id,
            st.module_id,
            m.module_code,
            m.module_name,
            st.assignment_id,
            st.title,
            st.description,
            st.task_type,
            st.scheduled_at,
            st.reminder_at,
            st.status,
            st.created_at
        FROM \`STUDY_TASK\` st
        INNER JOIN \`MODULE\` m
            ON st.module_id = m.module_id
        WHERE st.task_id = ?
          AND st.user_id = ?
    `, [taskId, userId]);

    return rows[0];
};


// Create a planner task
const createPlannerTask = async (
    userId,
    moduleId,
    assignmentId,
    title,
    description,
    taskType,
    scheduledAt,
    reminderAt
) => {
    const [result] = await db.query(
        `INSERT INTO \`STUDY_TASK\`
        (
            user_id,
            module_id,
            assignment_id,
            title,
            description,
            task_type,
            scheduled_at,
            reminder_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            userId,
            moduleId,
            assignmentId || null,
            title,
            description || null,
            taskType,
            scheduledAt || null,
            reminderAt || null
        ]
    );

    return result;
};


module.exports = {
    getPlannerTasksByUser,
    getPlannerTaskById,
    createPlannerTask
};