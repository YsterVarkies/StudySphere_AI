const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers["authorization"];

        if (!authHeader) {
            return res.status(401).json({
                message: "Access denied. No authentication token provided."
            });
        }

        // Expected format: Bearer TOKEN
        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                message: "Access denied. Invalid authentication format."
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Store decoded user information in request
        req.user = decoded;

        next();

    } catch (error) {
        console.error("Authentication error:", error);

        return res.status(401).json({
            message: "Access denied. Invalid or expired token."
        });
    }
};

module.exports = {
    authenticateToken
};