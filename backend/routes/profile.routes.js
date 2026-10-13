const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.put('/profile', authenticateToken, profileController.updateProfile);

module.exports = router;