const Announcement = require('../models/announcement.model');

/**
 * POST /api/announcements
 * Create a new announcement
 */
exports.createAnnouncement = async (req, res) => {
  try {
    // TEMP: auth disabled
    const createdByUserId = req.body.userId || req.query.userId || 1;
    const { moduleId, title, content } = req.body;

    if (!moduleId || !title || !content) {
      return res.status(400).json({
        success: false,
        message: 'moduleId, title and content are required',
      });
    }

    const announcementId = await Announcement.create({
      moduleId,
      createdByUserId,
      title,
      content,
    });

    const announcement = await Announcement.getById(announcementId);

    return res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      data: announcement,
    });
  } catch (error) {
    console.error('createAnnouncement error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create announcement',
    });
  }
};

/**
 * GET /api/announcements
 * Get all announcements (optional ?moduleId=)
 */
exports.getAnnouncements = async (req, res) => {
  try {
    const { moduleId } = req.query;

    const announcements = await Announcement.getAll(moduleId || null);

    return res.json({
      success: true,
      data: announcements,
    });
  } catch (error) {
    console.error('getAnnouncements error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch announcements',
    });
  }
};

/**
 * GET /api/announcements/:id
 */
exports.getAnnouncementById = async (req, res) => {
  try {
    const announcementId = parseInt(req.params.id, 10);

    const announcement = await Announcement.getById(announcementId);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found',
      });
    }

    return res.json({
      success: true,
      data: announcement,
    });
  } catch (error) {
    console.error('getAnnouncementById error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch announcement',
    });
  }
};

/**
 * PUT /api/announcements/:id
 */
exports.updateAnnouncement = async (req, res) => {
  try {
    const announcementId = parseInt(req.params.id, 10);
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'title and content are required',
      });
    }

    const updated = await Announcement.update(announcementId, { title, content });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found',
      });
    }

    const announcement = await Announcement.getById(announcementId);

    return res.json({
      success: true,
      message: 'Announcement updated successfully',
      data: announcement,
    });
  } catch (error) {
    console.error('updateAnnouncement error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update announcement',
    });
  }
};

/**
 * DELETE /api/announcements/:id
 */
exports.deleteAnnouncement = async (req, res) => {
  try {
    const announcementId = parseInt(req.params.id, 10);

    const deleted = await Announcement.delete(announcementId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found',
      });
    }

    return res.json({
      success: true,
      message: 'Announcement deleted successfully',
    });
  } catch (error) {
    console.error('deleteAnnouncement error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete announcement',
    });
  }
};