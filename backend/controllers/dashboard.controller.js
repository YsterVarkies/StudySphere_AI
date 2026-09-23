const Dashboard = require("../models/dashboard.model");

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

module.exports = {
    getDashboard
};