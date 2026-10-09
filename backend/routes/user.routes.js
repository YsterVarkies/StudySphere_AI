// User Routes
// Defines protected API routes for user management

const express = require('express');
const router = express.Router();

const userController = require('../controllers/user.controller');

const {
    authenticateToken,
    requireRole
} = require('../middleware/auth.middleware');

// All user management routes require authentication
// and administrator privileges
router.use(authenticateToken);
router.use(requireRole('admin'));

// Get all users
router.get('/', userController.getAllUsers);

// Get one user by ID
router.get('/:id', userController.getUserById);

// Update a user (Name, Email, Role) - supports full edit modal
router.put('/:id', userController.updateUser);

// Delete a user
router.delete('/:id', userController.deleteUser);

// Update a user's role
router.patch('/:id/role', userController.updateUserRole);

// Activate or deactivate a user account
router.patch('/:id/status', userController.updateUserStatus);

module.exports = router;
