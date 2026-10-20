const Profile = require('../models/profile.model');

function getUserId(req) {
  return req.user?.user_id || req.user?.id || null;
}

exports.getMe = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const user = await Profile.getById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.json({
      success: true,
      data: {
        user_id: user.user_id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        cohort_id: user.cohort_id,
        student_number: user.student_number || '',
        firstName: user.first_name,
        lastName: user.last_name,
        studentNumber: user.student_number || '',
        cohortId: user.cohort_id,
      },
    });
  } catch (error) {
    console.error('getMe error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const {
      first_name,
      last_name,
      student_number,
      email,
      cohort_id,
      year_of_study,
    } = req.body;

    if (!first_name || !last_name || !email) {
      return res.status(400).json({
        success: false,
        message: 'first_name, last_name and email are required',
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const emailTaken = await Profile.emailTakenByOther(cleanEmail, userId);
    if (emailTaken) {
      return res.status(409).json({
        success: false,
        message: 'Email is already used by another account',
      });
    }

    const updated = await Profile.updateProfile(userId, {
      first_name: String(first_name).trim(),
      last_name: String(last_name).trim(),
      email: cleanEmail,
      cohort_id: cohort_id ? Number(cohort_id) : null,
      student_number: student_number
        ? String(student_number).trim()
        : null,
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    return res.json({
      success: true,
      message: 'Profile settings updated successfully!',
      data: {
        first_name: String(first_name).trim(),
        last_name: String(last_name).trim(),
        email: cleanEmail,
        cohort_id: cohort_id ? Number(cohort_id) : null,
        student_number: student_number
          ? String(student_number).trim()
          : null,
        studentNumber: student_number
          ? String(student_number).trim()
          : null,
      },
    });
  } catch (error) {
    console.error('updateProfile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile details.',
    });
  }
};