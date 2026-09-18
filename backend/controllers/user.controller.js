// User Controller
// Handles user management requests

const User = require('../models/user.model'); //Will load the User Model into the code

// Get all users
const getAllUsers = async (req, res) => {
    try {
        const users = await User.getAllUsers();

        return res.status(200).json(users);
    } catch (error) {
        console.error('Error getting users:', error);

        return res.status(500).json({
            message: 'Failed to retrieve users'
        });
    }
};

// Get one user by ID
const getUserById = async (req, res) => {
    try {
        const userId = req.params.id;

        const user = await User.getUserById(userId);

        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        return res.status(200).json(user);
    } catch (error) {
        console.error('Error getting user:', error);

        return res.status(500).json({
            message: 'Failed to retrieve user'
        });
    }
};

// Update a user's role
const updateUserRole = async (req, res) => {
    try {
        const userId = req.params.id;
        const { role } = req.body;

        if (!['student', 'admin'].includes(role)) {
            return res.status(400).json({
                message: 'Role must be student or admin'
            });
        }

        const result = await User.updateUserRole(userId, role);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        return res.status(200).json({
            message: 'User role updated successfully'
        });
    } catch (error) {
        console.error('Error updating user role:', error);

        return res.status(500).json({
            message: 'Failed to update user role'
        });
    }
};

// Activate or deactivate a user account
const updateUserStatus = async (req, res) => {
    try {
        const userId = req.params.id;
        const { is_active } = req.body;

        if (typeof is_active !== 'boolean') {
            return res.status(400).json({
                message: 'is_active must be true or false'
            });
        }

        const result = await User.updateUserStatus(
            userId,
            is_active
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        return res.status(200).json({
            message: is_active
                ? 'User account activated successfully'
                : 'User account deactivated successfully'
        });
    } catch (error) {
        console.error('Error updating user status:', error);

        return res.status(500).json({
            message: 'Failed to update user status'
        });
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    updateUserRole,
    updateUserStatus
};
