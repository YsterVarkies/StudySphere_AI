const Announcement = require('../models/announcement.model');

/**
 * POST /api/announcements
 * Create a new announcement
 */
exports.createAnnouncement = async (req, res) => {
  try {
    // The user ID comes from the authenticated JWT.
    const createdByUserId = req.user?.user_id;

    const { moduleId, title, content, category } = req.body;

    const allowedCategories = [
      'General',
      'Academic',
      'Campus',
      'Deadline',
    ];

    if (!createdByUserId) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated user ID not found',
      });
    }

    if (
      typeof title !== 'string' ||
      !title.trim() ||
      typeof content !== 'string' ||
      !content.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required',
      });
    }

    if (!allowedCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid announcement category',
      });
    }

    // General and Campus announcements apply to all students.
    const isCampusWide = ['General', 'Campus'].includes(category);

    if (!isCampusWide && !moduleId) {
      return res.status(400).json({
        success: false,
        message: 'Select a module for Academic or Deadline announcements',
      });
    }

    const finalModuleId = isCampusWide ? null : Number(moduleId);

    if (
      finalModuleId !== null &&
      (!Number.isInteger(finalModuleId) || finalModuleId <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid module',
      });
    }

    const announcementId = await Announcement.create({
      moduleId: finalModuleId,
      createdByUserId,
      title: title.trim(),
      content: content.trim(),
      category,
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
    const role = req.user?.role?.toLowerCase();
    const userId = req.user?.user_id;

    let announcements;

    if (role === 'admin' || role === 'administrator') {
      const { moduleId } = req.query;
      announcements = await Announcement.getAll(moduleId || null);
    } else {
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authenticated user ID not found',
        });
      }

      announcements =
        await Announcement.getVisibleToStudent(userId);
    }

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