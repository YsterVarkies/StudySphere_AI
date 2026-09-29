const path = require("path");
require("dotenv").config({
    path: path.resolve(__dirname, ".env")
});

const express = require("express");
const cors = require("cors");
const db = require("./config/db");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection test
async function testDatabaseConnection() {
    try {
        const [rows] = await db.query("SELECT 1 AS connected");

        console.log("Database connection successful.");
        console.log("Query result:", rows[0]);
    } catch (error) {
        console.error("Database connection failed.");
        console.error(error.message);
        process.exitCode = 1;
    }
}



// YOUR ROUTES

const authRoutes = require("./routes/auth.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const documentRoutes = require("./routes/document.routes");
const plannerRoutes = require("./routes/planner.routes");

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/planner", plannerRoutes);



//FEATURE ROUTES


// Summary test route
app.get("/api/test-summary", (req, res) => {
    res.json({
        message: "Summary test route works"
    });
});

// Flashcards
const flashcardRoutes = require("./src/routes/flashcard.routes");
app.use("/api/flashcards", flashcardRoutes);

// Announcements
const announcementRoutes = require("./src/routes/announcement.routes");
app.use("/api/announcements", announcementRoutes);

// Quizzes
const quizRoutes = require("./src/routes/quiz.routes");
app.use("/api/quizzes", quizRoutes);

// AI Chat
const aiChatRoutes = require("./src/routes/aiChat.routes");
app.use("/api/chat", aiChatRoutes);



// AMIN - ANALYTICS
const userGrowth = "+12%";

app.get("/api/analytics", async (req, res) => {
    try {
        const [userCountResult] = await db.query(
            "SELECT COUNT(*) as count FROM USER"
        );

        const activeUsers = userCountResult[0].count;

        let userGrowth = "+0%";
        try {
            const [thisWeekResult] = await db.query(
                "SELECT COUNT(*) as count FROM USER WHERE created_at >= NOW() - INTERVAL 7 DAY"
            );
            const [lastWeekResult] = await db.query(
                "SELECT COUNT(*) as count FROM USER WHERE created_at >= NOW() - INTERVAL 14 DAY AND created_at < NOW() - INTERVAL 7 DAY"
            );
            
            const thisWeekCount = thisWeekResult[0]?.count || 0;
            const lastWeekCount = lastWeekResult[0]?.count || 0;

            if (lastWeekCount > 0) {
                const growthRate = Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100);
                userGrowth = (growthRate >= 0 ? `+${growthRate}%` : `${growthRate}%`);
            } else if (thisWeekCount > 0) {
                userGrowth = "+100%";
            }
        } catch (calcErr) {
            console.log("Could not calculate dynamic growth, defaulting to +0%", calcErr.message);
        }

        const [moduleCountResult] = await db.query(
            "SELECT COUNT(*) as count FROM MODULE"
        );

        const modulesLive = moduleCountResult[0].count;

        const [aiResult] = await db.query(
            "SELECT COUNT(*) as count FROM CHAT_MESSAGE"
        );

        const aiRequestsToday = aiResult[0].count;

        const [dbModules] = await db.query(`
            SELECT m.module_id, m.module_name, COUNT(cs.module_id) AS usage_count
            FROM MODULE m
            LEFT JOIN CHAT_SESSION cs ON m.module_id = cs.module_id
            GROUP BY m.module_id, m.module_name
            ORDER BY usage_count DESC
            LIMIT 4
        `);

        // Get the highest AI request count (the top module) to use as the 100% baseline
        const maxUsage = dbModules.length > 0 && dbModules[0].usage_count > 0 
            ? Number(dbModules[0].usage_count) 
            : 1;

        // Calculate percentages proportionally based on real AI chat volume
        const activeModulesList = dbModules.map((m) => {
            const usage = Number(m.usage_count) || 0;
            const percentage = Math.round((usage / maxUsage) * 100);
            
            return {
                name: m.module_name,
                percentage: percentage
            };
        });

        const [logs] = await db.query(
            "SELECT * FROM USER_ACTIVITY_LOG ORDER BY created_at DESC LIMIT 5"
        );

        const recentLogs = logs.map(l => ({
            type:
                l.action ||
                l.activity_type ||
                l.event_type ||
                "Activity",

            message:
                l.details ||
                l.description ||
                "System interaction",

            time:
                l.created_at ||
                new Date()
        }));

        res.json({
            activeUsers,
            userGrowth,
            modulesLive,
            aiRequestsToday,
            systemErrors: 0,
            activeModules: activeModulesList,
            recentLogs
        });

    } catch (err) {
        console.error(
            "Database error fetching analytics:",
            err
        );

        res.status(500).json({
            error: err.message
        });
    }
});



// ADMIN - MODULES & COHORTS
app.get("/api/modules", async (req, res) => {
    try {
        const [modules] = await db.query(
            "SELECT module_id, module_code AS code, module_name AS name, description FROM MODULE"
        );

        const [cohorts] = await db.query(
            "SELECT cohort_id AS id, cohort_name AS name, academic_year AS academicYear FROM COHORT"
        );

        res.json({
            modules: modules.map(m => ({
                ...m,
                status: "Active"
            })),
            cohorts
        });

    } catch (err) {
        console.error(
            "Database error fetching modules/cohorts:",
            err
        );

        res.status(500).json({
            error: err.message
        });
    }
});

app.post("/api/modules", async (req, res) => {
    try {
        const {
            code,
            name,
            description
        } = req.body;

        const query =
            "INSERT INTO MODULE (module_code, module_name, description) VALUES (?, ?, ?)";

        await db.query(query, [
            code.trim().toUpperCase(),
            name.trim(),
            description
        ]);

        res.status(201).json({
            success: true,
            code: code.trim().toUpperCase(),
            name: name.trim(),
            status: "Active"
        });

    } catch (err) {
        console.error(
            "Database error inserting module:",
            err
        );

        res.status(500).json({
            error: err.message
        });
    }
});

app.post("/api/cohorts", async (req, res) => {
    try {
        const {
            name,
            academicYear
        } = req.body;

        const query =
            "INSERT INTO COHORT (cohort_name, academic_year) VALUES (?, ?)";

        await db.query(query, [
            name.trim(),
            academicYear
        ]);

        res.status(201).json({
            success: true,
            name: name.trim(),
            academicYear
        });

    } catch (err) {
        console.error(
            "Database error inserting cohort:",
            err
        );

        res.status(500).json({
            error: err.message
        });
    }
});


// Delete module by code
app.delete("/api/modules/:code", async (req, res) => {
    try {
        const {
            code
        } = req.params;

        await db.query(
            "DELETE FROM MODULE WHERE module_code = ?",
            [code]
        );

        res.json({
            success: true,
            message: "Module deleted successfully"
        });

    } catch (err) {
        console.error(
            "Database error deleting module:",
            err
        );

        res.status(500).json({
            error: err.message
        });
    }
});


// Delete cohort by ID
app.delete("/api/cohorts/:id", async (req, res) => {
    try {
        const {
            id
        } = req.params;

        await db.query(
            "DELETE FROM COHORT WHERE cohort_id = ?",
            [id]
        );

        res.json({
            success: true,
            message: "Cohort deleted successfully"
        });

    } catch (err) {
        console.error(
            "Database error deleting cohort:",
            err
        );

        res.status(500).json({
            error: err.message
        });
    }
});


// Update module by code
app.put("/api/modules/:code", async (req, res) => {
    try {
        const oldCode = req.params.code;

        const {
            code,
            name,
            module_name,
            description
        } = req.body;

        const finalCode =
            (code || oldCode)
                .trim()
                .toUpperCase();

        const finalName =
            name || module_name;

        const query =
            "UPDATE MODULE SET module_code = ?, module_name = ?, description = ? WHERE module_code = ?";

        const [result] = await db.query(
            query,
            [
                finalCode,
                finalName
                    ? finalName.trim()
                    : null,
                description ||
                    "Standard module description",
                oldCode
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: "Module not found or no changes made"
            });
        }

        res.json({
            success: true,
            message: "Module updated successfully"
        });

    } catch (err) {
        console.error(
            "Database error updating module:",
            err
        );

        res.status(500).json({
            error: err.message
        });
    }
});


// Update cohort by ID
app.put("/api/cohorts/:id", async (req, res) => {
    try {
        const {
            id
        } = req.params;

        const {
            name,
            academicYear
        } = req.body;

        const query =
            "UPDATE COHORT SET cohort_name = ?, academic_year = ? WHERE cohort_id = ?";

        await db.query(
            query,
            [
                name.trim(),
                academicYear,
                id
            ]
        );

        res.json({
            success: true,
            message: "Cohort updated successfully"
        });

    } catch (err) {
        console.error(
            "Database error updating cohort:",
            err
        );

        res.status(500).json({
            error: err.message
        });
    }
});



// ADMIN - USER MANAGEMENT

app.get("/api/users", async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT user_id, first_name, last_name, email, role, is_active FROM USER"
        );

        const formattedUsers = rows.map(u => ({
            id: u.user_id,
            name: `${u.first_name} ${u.last_name}`,
            email: u.email,
            role:
                u.role === "admin"
                    ? "Administrator"
                    : "Student",
            status:
                u.is_active
                    ? "Active"
                    : "Inactive"
        }));

        res.json(formattedUsers);

    } catch (err) {
        console.error(
            "Database error fetching users:",
            err
        );

        res.status(500).json({
            error: err.message
        });
    }
});

app.put("/api/users/:id", async (req, res) => {
    try {
        const {
            id
        } = req.params;

        const {
            name,
            email,
            role
        } = req.body;

        const nameParts = name.split(" ");

        const firstName =
            nameParts[0];

        const lastName =
            nameParts
                .slice(1)
                .join(" ");

        const dbRole =
            role === "Administrator"
                ? "admin"
                : "student";

        const query =
            "UPDATE USER SET first_name = ?, last_name = ?, email = ?, role = ? WHERE user_id = ?";

        await db.query(
            query,
            [
                firstName,
                lastName,
                email.trim(),
                dbRole,
                id
            ]
        );

        res.json({
            success: true,
            message: "User updated successfully"
        });

    } catch (err) {
        console.error(
            "Database error updating user:",
            err
        );

        res.status(500).json({
            error: err.message
        });
    }
});

app.delete("/api/users/:id", async (req, res) => {
    try {
        const {
            id
        } = req.params;

        await db.query(
            "DELETE FROM USER WHERE user_id = ?",
            [id]
        );

        res.json({
            success: true,
            message: "User deleted successfully"
        });

    } catch (err) {
        console.error(
            "Database error deleting user:",
            err
        );

        res.status(500).json({
            error: err.message
        });
    }
});
//End Admin Code


// HEALTH CHECK

app.get("/", (req, res) => {
    res.json({
        message: "StudySphere API is running"
    });
});



// SERVER

const PORT = process.env.PORT || 5000;

if (require.main === module) {
    app.listen(PORT, async () => {
        console.log(
            `Server running on http://localhost:${PORT}`
        );

        await testDatabaseConnection();
    });
}

module.exports = {
    app,
    testDatabaseConnection
};