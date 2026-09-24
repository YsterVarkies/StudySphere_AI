const Planner = require("../models/planner.model");

// Get all planner tasks for the logged-in user
const getPlannerTasks = async (req, res) => {
    try {
        const userId = req.user.user_id;

        const tasks = await Planner.getPlannerTasksByUser(userId);

        return res.status(200).json({
            message: "Planner tasks retrieved successfully.",
            tasks
        });

    } catch (error) {
        console.error("Planner retrieval error:", error);

        return res.status(500).json({
            message: "Server error while retrieving planner tasks."
        });
    }
};


// Get one planner task for the logged-in user
const getPlannerTask = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const taskId = req.params.id;

        const task = await Planner.getPlannerTaskById(
            taskId,
            userId
        );

        if (!task) {
            return res.status(404).json({
                message: "Planner task not found."
            });
        }

        return res.status(200).json({
            message: "Planner task retrieved successfully.",
            task
        });

    } catch (error) {
        console.error("Planner retrieval error:", error);

        return res.status(500).json({
            message: "Server error while retrieving planner task."
        });
    }
};


// Create a planner task
const createPlannerTask = async (req, res) => {
    try {
        const userId = req.user.user_id;

        const {
            module_id,
            assignment_id,
            title,
            description,
            task_type,
            scheduled_at,
            reminder_at
        } = req.body;

        // Check required fields
        if (
            !module_id ||
            !title ||
            !task_type
        ) {
            return res.status(400).json({
                message: "Please provide module ID, title, and task type."
            });
        }

        const result = await Planner.createPlannerTask(
            userId,
            module_id,
            assignment_id,
            title,
            description,
            task_type,
            scheduled_at,
            reminder_at
        );

        return res.status(201).json({
            message: "Planner task created successfully.",
            task: {
                task_id: result.insertId,
                user_id: userId,
                module_id,
                assignment_id: assignment_id || null,
                title,
                description: description || null,
                task_type,
                scheduled_at: scheduled_at || null,
                reminder_at: reminder_at || null,
                status: "pending"
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
    getPlannerTask,
    createPlannerTask
};