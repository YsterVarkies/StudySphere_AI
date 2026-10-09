const db = require('../config/db');
const User = require('../models/user.model');

// Get all users
const getAllUsers = async (req, res) => {
    try {
        const users = await User.getAllUsers();
        const formattedUsers = users.map(u => ({
            id: u.user_id,
            user_id: u.user_id,
            name: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
            email: u.email,
            role: u.role === 'admin' ? 'Administrator' : 'Student',
            status: u.is_active ? 'Active' : 'Inactive'
        }));

        return res.status(200).json(formattedUsers);
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
// Update a user (Name, Email, Role) - supports full edit modal
const updateUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const { name, email, role } = req.body;

        const nameParts = (name || '').trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        let dbRole = 'student';
        if (role && (role.toLowerCase() === 'administrator' || role.toLowerCase() === 'admin')) {
            dbRole = 'admin';
        }

        const [result] = await db.query(
            "UPDATE USER SET first_name = ?, last_name = ?, email = ?, role = ? WHERE user_id = ?",
            [firstName, lastName, email, dbRole, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Error updating user:', error);
        return res.status(500).json({ message: 'Failed to update user' });
    }
};

/// Delete a user and all their dependent child records across all related tables safely
const deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;
        
        // 1. Delete dependent child records in the correct foreign-key dependency order
        await db.query("DELETE FROM STUDY_TASK WHERE user_id = ?", [userId]);
        await db.query("DELETE FROM DOCUMENT WHERE user_id = ?", [userId]);
        await db.query("DELETE FROM CHAT_MESSAGE WHERE chat_session_id IN (SELECT chat_session_id FROM CHAT_SESSION WHERE user_id = ?)", [userId]);
        await db.query("DELETE FROM CHAT_SESSION WHERE user_id = ?", [userId]);
        await db.query("DELETE FROM USER_ACTIVITY_LOG WHERE user_id = ?", [userId]);

        // 2. Now delete the parent user record
        const [result] = await db.query("DELETE FROM USER WHERE user_id = ?", [userId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json({ message: 'User and all related records deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        return res.status(500).json({ message: 'Failed to delete user due to foreign key constraints.' });
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
    updateUser,  
    deleteUser,
    updateUserRole,
    updateUserStatus
};
