
const express = require('express');

const router = express.Router();

const announcementController = require('../controllers/announcement.controller');
const { authenticateToken, requireRole } = require('../../middleware/auth.middleware');

// All announcement routes require the user to be logged in
router.use(authenticateToken);

// Students and admins can VIEW announcements
router.get('/', announcementController.getAnnouncements);

router.get('/:id', announcementController.getAnnouncementById);

// Only administrators can CREATE announcements
router.post(
    '/',
    requireRole('admin'),
    announcementController.createAnnouncement
);

// Only administrators can UPDATE announcements
router.put(
    '/:id',
    requireRole('admin'),
    announcementController.updateAnnouncement
);

// Only administrators can DELETE announcements
router.delete(
    '/:id',
    requireRole('admin'),
    announcementController.deleteAnnouncement
);

module.exports = router;
