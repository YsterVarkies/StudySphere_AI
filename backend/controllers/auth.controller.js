const bcrypt = require("bcrypt");
const testAuth = (req, res) => {
    res.json({
        message: "Authentication controller is working!"
    });
};

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

        // Check institutional email
        if (!email.endsWith(".edu") && !email.endsWith(".ac.za")) {
            return res.status(400).json({
                message: "Please use a valid institutional email address."
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

        // Database creation will be added once the database setup is confirmed
        return res.status(200).json({
            message: "Registration validation successful.",
            user: {
                first_name,
                last_name,
                email,
                cohort_id
            }
        });

    } catch (error) {
        console.error("Registration error:", error);

        return res.status(500).json({
            message: "Server error during registration."
        });
    }
};

module.exports = {
    testAuth,
    register
};