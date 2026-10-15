const Announcement = require('../models/announcement.model');
const db = require('../../config/db');

function getUserId(req) {
  return req.user?.user_id || req.user?.id || null;
}


exports.createAnnouncement = async (req, res) => {
  try {
    const createdByUserId = getUserId(req);
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

    const isCampusWide = ['General', 'Campus'].includes(category);

    if (!isCampusWide && !moduleId) {
      return res.status(400).json({
        success: false,
        message:
          'Select a module for Academic or Deadline announcements',
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

    const row = await Announcement.getById(announcementId);

    return res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      data: row,
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
    const userId = getUserId(req);
    const role = req.user?.role?.toLowerCase();
    const { moduleId, scope } = req.query;

    const isAdmin =
      role === 'admin' ||
      role === 'administrator' ||
      scope === 'admin';

    if (isAdmin) {
      let filter;

      if (moduleId === 'null' || moduleId === '') {
        filter = null;
      } else if (moduleId !== undefined) {
        filter = Number(moduleId);

        if (!Number.isInteger(filter) || filter <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Please select a valid module',
          });
        }
      } else {
        filter = undefined;
      }

      const rows = await Announcement.getAll(filter);

      return res.json({
        success: true,
        data: rows,
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated user ID not found',
      });
    }

    const rows = await Announcement.getVisibleToStudent(userId);

    return res.json({
      success: true,
      data: rows,
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
    const row = await Announcement.getById(parseInt(req.params.id, 10));
    if (!row) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    return res.json({ success: true, data: row });
  } catch (error) {
    console.error('getAnnouncementById error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch announcement',
    });
  }
};

exports.updateAnnouncement = async (req, res) => {
  try {
    const announcementId = parseInt(req.params.id, 10);
    const { title, content, moduleId } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'title and content are required',
      });
    }

    const updated = await Announcement.update(announcementId, {
      title: String(title).trim(),
      content: String(content).trim(),
      moduleId: moduleId != null && moduleId !== '' ? Number(moduleId) : null,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    const row = await Announcement.getById(announcementId);
    return res.json({ success: true, message: 'Updated', data: row });
  } catch (error) {
    console.error('updateAnnouncement error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update announcement',
    });
  }
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    const deleted = await Announcement.delete(parseInt(req.params.id, 10));
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    return res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    console.error('deleteAnnouncement error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete announcement',
    });
  }
};