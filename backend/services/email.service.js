
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

const sendPasswordResetEmail = async (email, resetLink) => {
    try {
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

        console.log("Password reset email sent:", info.messageId);
        return info;
    } catch (error) {
        console.error("Gmail email error:", error.message);
        throw new Error("Unable to send password reset email.");
    }
};

module.exports = { sendPasswordResetEmail };
