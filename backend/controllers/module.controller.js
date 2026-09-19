const Module = require("../models/module.model");

const getModules = async (req, res) => {
    try {
        const modules = await Module.getAllModules();

        return res.status(200).json({
            message: "Modules retrieved successfully.",
            modules
        });

    } catch (error) {
        console.error("Module retrieval error:", error);

        return res.status(500).json({
            message: "Server error while retrieving modules."
        });
    }
};

const createModule = async (req, res) => {
    try {
        const {
            module_code,
            module_name,
            description
        } = req.body;

        // Check required fields
        if (!module_code || !module_name) {
            return res.status(400).json({
                message: "Please provide module code and module name."
            });
        }

        const result = await Module.createModule(
            module_code,
            module_name,
            description || null
        );

        return res.status(201).json({
            message: "Module created successfully.",
            module: {
                module_id: result.insertId,
                module_code,
                module_name,
                description: description || null
            }
        });

    } catch (error) {
        console.error("Module creation error:", error);

        return res.status(500).json({
            message: "Server error while creating module."
        });
    }
};

module.exports = {
    getModules,
    createModule
};