const getPlannerTasks = (req, res) => {
    try {
        return res.status(200).json({
            message: "Planner tasks retrieved successfully.",
            tasks: []
        });

    } catch (error) {
        console.error("Planner retrieval error:", error);

        return res.status(500).json({
            message: "Server error while retrieving planner tasks."
        });
    }
};

const createPlannerTask = (req, res) => {
    try {
        const {
            title,
            description,
            due_date,
            priority
        } = req.body;

        // Check required fields
        if (!title || !due_date || !priority) {
            return res.status(400).json({
                message: "Please provide title, due date, and priority."
            });
        }

        return res.status(201).json({
            message: "Planner task validation successful.",
            task: {
                title,
                description: description || "",
                due_date,
                priority
            }
        });

    } catch (error) {
        console.error("Planner task creation error:", error);

        return res.status(500).json({
            message: "Server error while creating planner task."
        });
    }
};

module.exports = {
    getPlannerTasks,
    createPlannerTask
};