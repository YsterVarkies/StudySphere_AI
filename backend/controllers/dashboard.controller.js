const Dashboard = require("../models/dashboard.model");

function getPlannerDeadlineInput(body) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const dueAt = typeof body.dueAt === "string" ? body.dueAt : "";

    if (!title || title.length > 255 || Number.isNaN(Date.parse(dueAt))) return null;

    return { title, dueAt: dueAt.replace("T", " ").replace(/Z$/, "").slice(0, 19) };
}

const getDashboard = async (req, res) => {
    try {
        const dashboard = await Dashboard.getDashboardData(req.user);

        return res.status(200).json({
            message: "Dashboard data retrieved successfully.",
            dashboard
        });

    } catch (error) {
        console.error("Dashboard error:", error);

        return res.status(500).json({
            message: "Server error while retrieving dashboard data."
        });
    }
};

const createPlannerDeadline = async (req, res) => {
    const deadline = getPlannerDeadlineInput(req.body);
    if (!deadline) return res.status(400).json({ message: "A valid title and due date are required." });

    try {
        const deadlineId = await Dashboard.createPlannerDeadline(req.user.user_id, deadline);
        return res.status(201).json({ deadlineId });
    } catch (error) {
        console.error("Planner deadline creation error:", error);
        return res.status(500).json({ message: "Planner task could not be saved." });
    }
};

const updatePlannerDeadline = async (req, res) => {
    const deadline = getPlannerDeadlineInput(req.body);
    if (!deadline) return res.status(400).json({ message: "A valid title and due date are required." });

    try {
        const updated = await Dashboard.updatePlannerDeadline(req.user.user_id, req.params.id, deadline);
        if (!updated) return res.status(404).json({ message: "Planner task not found." });
        return res.status(200).json({ message: "Planner task updated." });
    } catch (error) {
        console.error("Planner deadline update error:", error);
        return res.status(500).json({ message: "Planner task could not be updated." });
    }
};

const deletePlannerDeadline = async (req, res) => {
    try {
        const deleted = await Dashboard.deletePlannerDeadline(req.user.user_id, req.params.id);
        if (!deleted) return res.status(404).json({ message: "Planner task not found." });
        return res.status(200).json({ message: "Planner task deleted." });
    } catch (error) {
        console.error("Planner deadline deletion error:", error);
        return res.status(500).json({ message: "Planner task could not be deleted." });
    }
};

module.exports = {
    getDashboard,
    createPlannerDeadline,
    updatePlannerDeadline,
    deletePlannerDeadline,
};