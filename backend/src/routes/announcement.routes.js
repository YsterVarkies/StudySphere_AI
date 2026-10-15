const express = require('express');

const router = express.Router();

const announcementController = require('../controllers/announcement.controller');
const { authenticateToken, requireRole } = require('../../middleware/auth.middleware');

// All announcement routes require the user to be logged in
router.use(authenticateToken);

// Students and admins can VIEW announcements
// Students: global (module_id NULL) + their modules
// Admin full list: GET /api/announcements?scope=admin
router.get('/', announcementController.getAnnouncements);

router.get('/:id', announcementController.getAnnouncementById);

// Only administrators can CREATE announcements
// body: { title, content, moduleId? }  — omit moduleId = all students
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