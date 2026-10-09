const Module = require("../models/module.model");
const db = require('../config/db');

const getModules = async (req, res) => {
    try {
        const modules = await Module.getAllModules();
        

        const formattedModules = modules.map(m => ({
            module_id: m.module_id,
            code: m.module_code,
            name: m.module_name,
            module_code: m.module_code,
            module_name: m.module_name,
            description: m.description,
            status: "Active"
        }));

        return res.status(200).json({
            message: "Modules retrieved successfully.",
            modules: formattedModules
        });

    } catch (error) {
        console.error("Module retrieval error:", error);
        return res.status(500).json({
            message: "Server error while retrieving modules."
        });
    }
};

const updateModule = async (req, res) => {
    try {
        const moduleId = req.params.id;
        const { module_code, module_name, description } = req.body;

        // Check if your table uses 'module_code' & 'module_name' or just 'code' & 'name'
        const [result] = await db.query(
            "UPDATE MODULE SET module_code = ?, module_name = ? WHERE module_id = ?",
            [module_code, module_name, moduleId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Module not found' });
        }

        return res.status(200).json({ message: 'Module updated successfully' });
    } catch (error) {
        console.error('Error updating module:', error);
        return res.status(500).json({ message: 'Failed to update module' });
    }
};

const deleteModule = async (req, res) => {
    try {
        const moduleId = req.params.id;

        // Clear foreign key dependencies if needed
        await db.query("DELETE FROM CHAT_SESSION WHERE module_id = ?", [moduleId]);
        await db.query("DELETE FROM COHORT_MODULE WHERE module_id = ?", [moduleId]);

        const [result] = await db.query("DELETE FROM MODULE WHERE module_id = ?", [moduleId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Module not found' });
        }

        return res.status(200).json({ message: 'Module deleted successfully' });
    } catch (error) {
        console.error('Error deleting module:', error);
        return res.status(500).json({ message: 'Failed to delete module due to foreign key constraints.' });
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
    deleteModule,
    updateModule,
    createModule
};