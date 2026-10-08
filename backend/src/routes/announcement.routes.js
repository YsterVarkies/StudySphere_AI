const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcement.controller');
const { authenticateToken, requireRole } = require('../../middleware/auth.middleware');

router.use(authenticateToken, requireRole('admin'));

router.post('/', announcementController.createAnnouncement);
router.get('/', announcementController.getAnnouncements);
router.get('/:id', announcementController.getAnnouncementById);
router.put('/:id', announcementController.updateAnnouncement);
router.delete('/:id', announcementController.deleteAnnouncement);

module.exports = router;