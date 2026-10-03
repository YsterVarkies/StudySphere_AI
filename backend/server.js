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

const { authenticateToken, requireRole } = require("./middleware/auth.middleware");

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


//Admin
// SECURE ADMIN ROUTES 
const analyticsRoutes = require("./routes/analytics.routes"); 
const userRoutes = require("./routes/user.routes");
const moduleRoutes = require("./routes/module.routes");
const cohortRoutes = require("./routes/cohort.routes");

app.use("/api/analytics", authenticateToken, requireRole("admin"), analyticsRoutes);
app.use("/api/users", authenticateToken, requireRole("admin"), userRoutes);
app.use("/api/modules", authenticateToken, requireRole("admin"), moduleRoutes);
app.use("/api/cohorts", authenticateToken, requireRole("admin"), cohortRoutes);

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