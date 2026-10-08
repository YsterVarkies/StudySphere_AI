const express = require("express");
const router = express.Router();
const db = require("../config/db"); 
const {
    authenticateToken,
    requireRole
} = require("../middleware/auth.middleware");

// GET /api/analytics - Fetch live summary analytics & dynamic growth from Aiven DB
router.get(
    "/",
    authenticateToken,
    requireRole("admin"),
    async (req, res) => {
    try {
        // 1. Fetch total active users count
        const [userCountResult] = await db.query("SELECT COUNT(*) AS total FROM USER");
        const activeUsers = userCountResult[0]?.total || 0;

        // 2. Calculate dynamic user growth (Last 7 days vs Previous 7 days)
        let userGrowthText = "+0%";
        try {
            const [recentUsers] = await db.query(
                "SELECT COUNT(*) AS count FROM USER WHERE created_at >= NOW() - INTERVAL 7 DAY"
            );
            const [previousUsers] = await db.query(
                "SELECT COUNT(*) AS count FROM USER WHERE created_at >= NOW() - INTERVAL 14 DAY AND created_at < NOW() - INTERVAL 7 DAY"
            );

            const currentWeekCount = recentUsers[0]?.count || 0;
            const prevWeekCount = previousUsers[0]?.count || 0;

            if (prevWeekCount > 0) {
                const growthRate = Math.round(((currentWeekCount - prevWeekCount) / prevWeekCount) * 100);
                userGrowthText = `${growthRate >= 0 ? '+' : ''}${growthRate}%`;
            } else if (currentWeekCount > 0) {
                userGrowthText = "+100%";
            }
        } catch (growthErr) {
            console.log("Growth calculation note: using fallback (check if created_at column exists in USER table)");
        }

        // 3. Fetch live modules count
        const [moduleCountResult] = await db.query("SELECT COUNT(*) AS total FROM MODULE");
        const modulesLive = moduleCountResult[0]?.total || 0;

        // 4. Fetch live AI requests count for today only
       const [aiResult] = await db.query(
            "SELECT COUNT(*) AS total FROM CHAT_MESSAGE WHERE DATE(created_at) = CURDATE()"
        );
        const aiRequestsToday = aiResult[0]?.total || 0; 
        
        //Count the system errors
        let systemErrors = 0;
        try {
            const [errorResult] = await db.query(`
                SELECT COUNT(*) AS total 
                FROM USER_ACTIVITY_LOG 
                WHERE LOWER(activity_type) LIKE '%system_error%' 
                AND created_at >= NOW() - INTERVAL 24 HOUR
            `);
            systemErrors = errorResult[0]?.total || 0;
        } catch (errErr) {
            console.error("System errors count error:", errErr.message);
        }

// 5. Fetch active modules based on actual AI chat interactions/usage
let activeModulesList = [];
try {
    const [moduleUsage] = await db.query(`
        SELECT m.module_name, m.module_code, COUNT(c.chat_session_id) AS interaction_count
        FROM MODULE m
        LEFT JOIN CHAT_SESSION c ON m.module_id = c.module_id
        GROUP BY m.module_id, m.module_name, m.module_code
        ORDER BY interaction_count DESC
        LIMIT 4
    `);

    // Find the highest count to calculate a relative percentage (max 100%)
    const maxCount = moduleUsage[0]?.interaction_count || 1;

    activeModulesList = moduleUsage.map(m => {
        const count = m.interaction_count || 0;
        // Calculate percentage relative to the most active module, with a minimum fallback for display
        const percentage = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
        
        return {
            name: m.module_name || m.module_code,
            percentage: percentage > 0 ? percentage : 10 // Gives a small visible bar even if count is 0
        };
        });
            } catch (usageErr) {
                // Fallback if the join fails
                const [dbModules] = await db.query("SELECT module_code, module_name FROM MODULE LIMIT 4");
                activeModulesList = dbModules.map((m, index) => ({
                    name: m.module_name || m.module_code,
                    percentage: 100 - (index * 20)
                }));
            }
        // 6. Fetch recent system logs from activity table
        let recentLogs = [];
        try {
            const [logs] = await db.query(`
                SELECT * 
                FROM USER_ACTIVITY_LOG 
                ORDER BY created_at DESC 
                LIMIT 5
            `);
            
            recentLogs = logs.map(l => ({
                type: l.action || l.activity_type || l.log_level || 'Activity',
                message: l.details || l.description || l.message || 'System interaction',
                time: l.created_at ? new Date(l.created_at).toLocaleTimeString() : 'Recent'
            }));
        } catch (logErr) {
            recentLogs = [{ type: 'Info', message: 'Connected to Aiven cloud database', time: 'Just now' }];
        }

        res.status(200).json({
            message: "Analytics fetched successfully.",
            analytics: {
                activeUsers,
                userGrowth: userGrowthText, // Now fully dynamic!
                modulesLive,
                aiRequestsToday,
                systemErrors ,
                activeModules: activeModulesList,
                recentLogs
            }
        });
    } catch (error) {
        console.error("Error fetching analytics:", error);
        res.status(500).json({ message: "Server error fetching analytics." });
    }
});

module.exports = router;