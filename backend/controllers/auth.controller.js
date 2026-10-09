const bcrypt = require("bcrypt");
const User = require("../models/user.model");
const jwt = require("jsonwebtoken");

const normalizeRole = (role) => {
    if (typeof role !== "string") return null;
    const normalizedRole = role.trim().toLowerCase();
    if (normalizedRole === "student") return "student";
    if (normalizedRole === "admin" || normalizedRole === "administrator") return "admin";
    return null;
};


const register = async (req, res) => {
    try {
       const {
            first_name,
            last_name,
            student_number,
            email,
            password,
            year_of_study,
            role,
            cohort_id
        } = req.body;

        const normalizedFirstName = typeof first_name === "string" ? first_name.trim() : "";
        const normalizedLastName = typeof last_name === "string" ? last_name.trim() : "";
        const normalizedStudentNumber = typeof student_number === "string" ? student_number.trim() : "";
        const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
        const normalizedYearOfStudy = typeof year_of_study === "string"
            ? year_of_study.trim()
            : year_of_study;
        const normalizedRole = normalizeRole(role);

        const requiredFields = [
            ["first_name", normalizedFirstName],
            ["last_name", normalizedLastName],
            ["student_number", normalizedStudentNumber],
            ["email", normalizedEmail],
            ["password", password],
            ["year_of_study", normalizedYearOfStudy],
            ["role", role]
        ];
        const missingField = requiredFields.find(([, value]) => (
            value === undefined || value === null || value === ""
        ));

        if (missingField) {
            return res.status(400).json({
                message: "Please provide all required fields.",
                field: missingField[0]
            });
        }

        if (!normalizedRole) {
            return res.status(400).json({
                message: "Please select a valid role.",
                field: "role"
            });
        }

        // Check email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({
                message: "Please provide a valid email address.",
                field: "email"
            });
        }

        const parsedYearOfStudy = Number(normalizedYearOfStudy);

        if (!Number.isInteger(parsedYearOfStudy)) {
            return res.status(400).json({
                message: "Year of study must be an integer.",
                field: "year_of_study"
            });
        }

        // Check password requirements
        if (typeof password !== "string") {
            return res.status(400).json({
                message: "Please provide a valid password.",
                field: "password"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters long.",
                field: "password"
            });
        }

        if (!/[A-Za-z]/.test(password)) {
            return res.status(400).json({
                message: "Password must contain at least one letter.",
                field: "password"
            });
        }

        if (!/[0-9]/.test(password)) {
            return res.status(400).json({
                message: "Password must contain at least one number.",
                field: "password"
            });
        }

        // Hash the password
        const password_hash = await bcrypt.hash(password, 10);

        // Create the user in the database
        const result = await User.createUser(
            cohort_id,
            normalizedFirstName,
            normalizedLastName,
            normalizedStudentNumber,
            normalizedEmail,
            password_hash,
            parsedYearOfStudy,
            normalizedRole
        );

        return res.status(201).json({
            message: "Registration successful.",
            user: {
                user_id: result.insertId,
                first_name: normalizedFirstName,
                last_name: normalizedLastName,
                student_number: normalizedStudentNumber,
                email: normalizedEmail,
                year_of_study: parsedYearOfStudy,
                cohort_id: cohort_id,
                role: normalizedRole,
                is_active: 1
            }
        });

   } catch (error) {
    console.error("Registration error:", error);

    // Handle duplicate email or student number
    if (error.code === "ER_DUP_ENTRY") {
        const duplicateKey = String(error.sqlMessage || error.message || "").toLowerCase();

        if (duplicateKey.includes("student_number")) {
            return res.status(409).json({
                message: "An account with this student number already exists.",
                field: "student_number"
            });
        }

        return res.status(409).json({
            message: "An account with this email already exists.",
            field: "email"
        });
    }

    return res.status(500).json({
        message: "Server error during registration."
    });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

        // Check required fields
        if (!normalizedEmail || typeof password !== "string" || password.length === 0) {
            return res.status(400).json({
                message: "Please provide email and password."
            });
        }

        // Find user by email
        const user = await User.findUserByEmail(normalizedEmail);

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        // Check if account is active
        if (!user.is_active) {
            return res.status(403).json({
                message: "Your account is inactive."
            });
        }

        // Compare password with stored hash
        const passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const role = normalizeRole(user.role);
        if (!role) {
            return res.status(403).json({
                message: "Your account role is missing or invalid. Please contact an administrator."
            });
        }

        // Create JWT
        const token = jwt.sign(
            {
                user_id: user.user_id,
                email: user.email,
                role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || "2h"
            }
        );

        return res.status(200).json({
            message: "Login successful.",
            token,
            user: {
                user_id: user.user_id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                cohort_id: user.cohort_id,
                role
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            message: "Server error during login."
        });
    }
};

const logout = (req, res) => {
    try {
        return res.status(200).json({
            message: "Logout successful."
        });
    } catch (error) {
        console.error("Logout error:", error);

        return res.status(500).json({
            message: "Server error during logout."
        });
    }
};

module.exports = {
    register,
    login,
    logout
};
