const Announcement = require('../models/announcement.model');
const db = require('../../config/db');

function getUserId(req) {
  return req.user?.user_id || req.user?.id || null;
}

function parseModuleId(value) {
  if (value == null || value === '') return null;
  const moduleId = Number(value);
  return Number.isInteger(moduleId) && moduleId > 0 ? moduleId : undefined;
}

async function moduleExists(moduleId) {
  if (moduleId === null) return true;
  const [rows] = await db.execute(
    'SELECT module_id FROM MODULE WHERE module_id = ?',
    [moduleId]
  );
  return rows.length > 0;
}

exports.createAnnouncement = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { title, content } = req.body;
    const moduleId = parseModuleId(req.body.moduleId);

    if (!title || !content || moduleId === undefined) {
      return res.status(400).json({
        success: false,
        message: 'title, content, and a valid module are required',
      });
    }

    if (!(await moduleExists(moduleId))) {
      return res.status(400).json({ success: false, message: 'Selected module does not exist' });
    }

    const id = await Announcement.create({
      moduleId: moduleId != null && moduleId !== '' ? Number(moduleId) : null,
      createdByUserId: userId,
      title: String(title).trim(),
      content: String(content).trim(),
    });

    const row = await Announcement.getById(id);

    return res.status(201).json({
      success: true,
      message: 'Announcement created',
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

exports.getAnnouncements = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { moduleId, scope } = req.query;

    if (scope === 'admin') {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
      let filter;
      if (moduleId === 'null' || moduleId === '') {
        filter = null;
      } else if (moduleId !== undefined) {
        filter = Number(moduleId);
      } else {
        filter = undefined;
      }

      const rows = await Announcement.getAll(filter);
      return res.json({ success: true, data: rows });
    }

    let moduleIds = [];
    if (userId) {
      try {
        const [mods] = await db.execute(
          `SELECT DISTINCT cm.module_id
           FROM USER u
           INNER JOIN COHORT_MODULE cm ON cm.cohort_id = u.cohort_id
           WHERE u.user_id = ?`,
          [userId]
        );
        moduleIds = mods.map((m) => m.module_id);
      } catch (e) {
        console.error('Could not load user modules:', e.message);
        moduleIds = [];
      }
    }

    const rows = await Announcement.getForStudent(moduleIds);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('getAnnouncements error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch announcements',
    });
  }
};

exports.getAnnouncementById = async (req, res) => {
  try {
    const userId = getUserId(req);
    const row = await Announcement.getById(parseInt(req.params.id, 10));
    if (!row) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    if (req.user.role !== 'admin' && row.module_id != null) {
      const [enrollment] = await db.execute(
        `SELECT 1
         FROM USER u
         INNER JOIN COHORT_MODULE cm ON cm.cohort_id = u.cohort_id
         WHERE u.user_id = ? AND cm.module_id = ?`,
        [userId, row.module_id]
      );
      if (enrollment.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
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
    const { title, content } = req.body;
    const moduleId = parseModuleId(req.body.moduleId);

    if (!title || !content || moduleId === undefined) {
      return res.status(400).json({
        success: false,
        message: 'title, content, and a valid module are required',
      });
    }

    if (!(await moduleExists(moduleId))) {
      return res.status(400).json({ success: false, message: 'Selected module does not exist' });
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