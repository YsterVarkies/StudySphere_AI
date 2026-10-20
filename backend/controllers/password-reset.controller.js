
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const db = require("../config/db");
const { sendPasswordResetEmail } = require("../services/email.service");

const forgotPassword = async (req, res) => {
    let token;
    let userId;

    try {
        const email =
            typeof req.body.email === "string"
                ? req.body.email.trim().toLowerCase()
                : "";

        if (!email) {
            return res.status(400).json({
                message: "Please provide your email address."
            });
        }

        const [users] = await db.query(
            `SELECT user_id, email
             FROM \`USER\`
             WHERE email = ? AND is_active = 1`,
            [email]
        );

        // Use the same response whether or not the account exists.
        if (users.length === 0) {
            return res.status(200).json({
                message: "If an account exists for that email, a reset link will be sent."
            });
        }

        userId = users[0].user_id;

        // Generate a cryptographically secure token.
        token = crypto.randomBytes(32).toString("hex");

        // Store only its SHA-256 hash.
        const tokenHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        // Invalidate previous unused reset links for this account.
        await db.query(
            `DELETE FROM PASSWORD_RESET_TOKEN
             WHERE user_id = ?`,
            [userId]
        );

        await db.query(
            `INSERT INTO PASSWORD_RESET_TOKEN
             (user_id, token_hash, expires_at)
             VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))`,
            [userId, tokenHash]
        );

        const frontendUrl = process.env.FRONTEND_URL;

        if (!frontendUrl) {
            throw new Error("FRONTEND_URL is not configured.");
        }

        const resetLink =
            `${frontendUrl.replace(/\/$/, "")}/reset-password?token=${token}`;

        await sendPasswordResetEmail(email, resetLink);

        return res.status(200).json({
            message: "If an account exists for that email, a reset link will be sent."
        });
    } catch (error) {
        console.error("Forgot password error:", error.message);

        // Avoid leaving a usable token behind if email delivery fails.
        if (userId && token) {
            try {
                const tokenHash = crypto
                    .createHash("sha256")
                    .update(token)
                    .digest("hex");

                await db.query(
                    `DELETE FROM PASSWORD_RESET_TOKEN
                     WHERE user_id = ? AND token_hash = ?`,
                    [userId, tokenHash]
                );
            } catch (cleanupError) {
                console.error(
                    "Reset token cleanup error:",
                    cleanupError.message
                );
            }
        }

        return res.status(500).json({
            message: "Unable to process the password reset request right now."
        });
    }
};

const resetPassword = async (req, res) => {
    const { token, password } = req.body;

    if (
        typeof token !== "string" ||
        !/^[a-f0-9]{64}$/i.test(token)
    ) {
        return res.status(400).json({
            message: "The reset link is invalid or has expired."
        });
    }

    if (typeof password !== "string" || password.length < 8) {
        return res.status(400).json({
            message: "Password must be at least 8 characters long."
        });
    }

    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        return res.status(400).json({
            message: "Password must contain at least one letter and one number."
        });
    }

    const tokenHash = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    let connection;

    try {
        const passwordHash = await bcrypt.hash(password, 10);

        connection = await db.getConnection();
        await connection.beginTransaction();

        const [tokens] = await connection.query(
            `SELECT reset_id, user_id
             FROM PASSWORD_RESET_TOKEN
             WHERE token_hash = ?
               AND expires_at > NOW()
               AND used_at IS NULL
             FOR UPDATE`,
            [tokenHash]
        );

        if (tokens.length === 0) {
            await connection.rollback();

            return res.status(400).json({
                message: "The reset link is invalid or has expired."
            });
        }

        const reset = tokens[0];

        await connection.query(
            `UPDATE \`USER\`
             SET password_hash = ?
             WHERE user_id = ?`,
            [passwordHash, reset.user_id]
        );

        await connection.query(
            `UPDATE PASSWORD_RESET_TOKEN
             SET used_at = NOW()
             WHERE reset_id = ?`,
            [reset.reset_id]
        );

        // Invalidate any other reset links for this account.
        await connection.query(
            `DELETE FROM PASSWORD_RESET_TOKEN
             WHERE user_id = ? AND reset_id <> ?`,
            [reset.user_id, reset.reset_id]
        );

        await connection.commit();

        return res.status(200).json({
            message: "Password reset successful. You can now log in."
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error("Reset password error:", error.message);

        return res.status(500).json({
            message: "Unable to reset the password right now."
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

module.exports = {
    forgotPassword,
    resetPassword
};
