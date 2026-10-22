
const nodemailer = require("nodemailer");

const assertPasswordResetEmailConfigured = () => {
    const requiredSettings = [
        "EMAIL_USER",
        "EMAIL_APP_PASSWORD",
        "EMAIL_FROM"
    ];
    const missingSettings = requiredSettings.filter(
        (setting) => !process.env[setting]?.trim()
    );

    if (missingSettings.length > 0) {
        const error = new Error("Password reset email configuration is incomplete.");
        error.code = "RESET_EMAIL_CONFIG_MISSING";
        throw error;
    }
};

const sendPasswordResetEmail = async (email, resetLink) => {
    try {
        assertPasswordResetEmailConfigured();

        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_APP_PASSWORD.replace(/\s/g, "")
            }
        });

        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: email,
            subject: "Reset your StudySphere password",
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2>Reset your StudySphere password</h2>
                    <p>We received a request to reset your password.</p>
                    <p>
                        <a href="${resetLink}"
                           style="background:#2563eb;color:white;padding:12px 18px;
                                  text-decoration:none;border-radius:6px;">
                            Reset Password
                        </a>
                    </p>
                    <p>This link expires in 15 minutes and can only be used once.</p>
                    <p>If you did not request a password reset, you can ignore this email.</p>
                </div>
            `
        });

        if (!Array.isArray(info.accepted) || info.accepted.length === 0) {
                const error = new Error("The email provider did not accept the reset email.");
                error.code = "RESET_EMAIL_RECIPIENT_NOT_ACCEPTED";
                throw error;
        }

        console.info("Password reset email accepted by SMTP provider.", {
                acceptedRecipients: info.accepted.length,
                rejectedRecipients: Array.isArray(info.rejected) ? info.rejected.length : 0
        });
        return info;
    } catch (error) {
        console.error("Password reset email delivery failed:", {
                code: error.code || "RESET_EMAIL_DELIVERY_FAILED",
                responseCode: error.responseCode || undefined,
                command: error.command || undefined
        });

        if (error.code === "RESET_EMAIL_CONFIG_MISSING") {
                throw error;
        }

        const deliveryError = new Error("Unable to send password reset email.");
        deliveryError.code = "RESET_EMAIL_DELIVERY_FAILED";
        deliveryError.providerCode = error.code || "UNKNOWN";
        deliveryError.responseCode = error.responseCode;
        deliveryError.command = error.command;
        throw deliveryError;
    }
};

module.exports = {
    assertPasswordResetEmailConfigured,
    sendPasswordResetEmail
};
