const Profile = require('../models/profile.model');

function getUserId(req) {
  return req.user?.user_id || req.user?.id || null;
}

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
    });
  } catch (error) {
    console.error('updateProfile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile details.',
    });
  }
};