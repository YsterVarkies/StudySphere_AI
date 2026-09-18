require("dotenv").config();

const express = require("express");

const app = express();

app.use(express.json());


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

// Server
const PORT = 5000;

app.listen(PORT, () => {
    console.log(`StudySphere backend running on port ${PORT}`);
});