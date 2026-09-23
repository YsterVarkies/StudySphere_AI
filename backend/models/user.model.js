// User Model
// Handles all database queries related to users

const db = require('../config/db'); 

// Get all users
const getAllUsers = async () => {
    const [rows] = await db.query(`
        SELECT 
            user_id,
            cohort_id,
            first_name,
            last_name,
            email,
            role,
            is_active,
            created_at
        FROM \`USER\`
    `);

    return rows;
};

// Get one user by ID
const getUserById = async (userId) => {
    const [rows] = await db.query(`
        SELECT 
            user_id,
            cohort_id,
            first_name,
            last_name,
            email,
            role,
            is_active,
            created_at
        FROM \`USER\`
        WHERE user_id = ?
    `, [userId]);

    return rows[0];
};

// Update a user's role
const updateUserRole = async (userId, role) => {
    const [result] = await db.query(
        `UPDATE \`USER\`
         SET role = ?
         WHERE user_id = ?`,
        [role, userId]
    );

    return result;
};

// Activate or deactivate a user account
const updateUserStatus = async (userId, isActive) => {
    const [result] = await db.query(
        `UPDATE \`USER\`
         SET is_active = ?
         WHERE user_id = ?`,
        [isActive, userId]
    );

    return result;
};

// Create a new user
const createUser = async (
    firstName,
    lastName,
    studentNumber,
    email,
    passwordHash,
    yearOfStudy
) => {
    const [result] = await db.query(
        `INSERT INTO \`USER\`
        (cohort_id, first_name, last_name, student_number, email, password_hash, year_of_study, role, is_active, created_at)
        VALUES (NULL, ?, ?, ?, ?, ?, ?, 'student', 1, NOW())`,
        [
            firstName,
            lastName,
            studentNumber,
            email,
            passwordHash,
            yearOfStudy
        ]
    );

    return result;
};

// Find a user by email for login
const findUserByEmail = async (email) => {
    const [rows] = await db.query(
        `SELECT
            user_id,
            cohort_id,
            first_name,
            last_name,
            email,
            password_hash,
            role,
            is_active
        FROM \`USER\`
        WHERE email = ?`,
        [email]
    );

    return rows[0];
};

module.exports = {
    getAllUsers,
    getUserById,
    updateUserRole,
    updateUserStatus,
    createUser,
    findUserByEmail
};
