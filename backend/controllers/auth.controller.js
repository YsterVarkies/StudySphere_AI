const bcrypt = require("bcrypt");
const User = require("../models/user.model");
const jwt = require("jsonwebtoken");



const register = async (req, res) => {
    try {
        const {
            first_name,
            last_name,
            email,
            password,
            cohort_id
        } = req.body;

        // Check that required fields were provided
        if (!first_name || !last_name || !email || !password) {
            return res.status(400).json({
                message: "Please provide all required fields."
            });
        }

        
        // Check email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: "Please provide a valid email address."
            });
        }
        

        // Check password requirements
        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters long."
            });
        }

        if (!/[A-Za-z]/.test(password)) {
            return res.status(400).json({
                message: "Password must contain at least one letter."
            });
        }

        if (!/[0-9]/.test(password)) {
            return res.status(400).json({
                message: "Password must contain at least one number."
            });
        }

        // Hash the password
        const password_hash = await bcrypt.hash(password, 10);

        // Create the user in the database
        const result = await User.createUser(
            cohort_id,
            first_name,
            last_name,
            email,
            password_hash
        );

        return res.status(201).json({
            message: "Registration successful.",
            user: {
                user_id: result.insertId,
                first_name,
                last_name,
                email,
                cohort_id,
                role: "student"
            }
        });

   } catch (error) {
    console.error("Registration error:", error);

    // Handle duplicate email
    if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
            message: "An account with this email already exists."
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

        // Check required fields
        if (!email || !password) {
            return res.status(400).json({
                message: "Please provide email and password."
            });
        }

        // Find user by email
        const user = await User.findUserByEmail(email);

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

        // Create JWT
        const token = jwt.sign(
            {
                user_id: user.user_id,
                email: user.email,
                role: user.role
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
                role: user.role
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
