const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());


// Database
let db;

try {
    db = require("./config/db");
} catch (error) {
    console.error("Database configuration error:", error.message);
    process.exitCode = 1;
}

// Routes
const authRoutes = require("./routes/auth.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const documentRoutes = require("./routes/document.routes");
const plannerRoutes = require("./routes/planner.routes");
const cohortRoutes = require("./routes/cohort.routes");
const moduleRoutes = require("./routes/module.routes");

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/planner", plannerRoutes);
app.use("/api/cohorts", cohortRoutes);
app.use("/api/modules", moduleRoutes);

// Test route
app.get("/", (req, res) => {
    res.json({
        message: "StudySphere backend is running!"
    });
});

// Database connection test
async function testDatabaseConnection() {
    if (!db) {
        return;
    }

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

// Server
const PORT = process.env.PORT || 5000;

if (require.main === module) {
    app.listen(PORT, async () => {
        console.log(`StudySphere backend running on port ${PORT}`);
        await testDatabaseConnection();
    });
}

module.exports = {
    app,
    testDatabaseConnection
};