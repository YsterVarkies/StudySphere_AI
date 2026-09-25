const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers["authorization"];

        if (!authHeader) {
            return res.status(401).json({
                message: "Access denied. No authentication token provided."
            });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                message: "Access denied. Invalid authentication format."
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();

    } catch (error) {
        console.error("Authentication error:", error);
        return res.status(401).json({
            message: "Access denied. Invalid or expired token."
        });
    }
};

const requireRole = (role) => {
    return (req, res, next) => {
        if (!req.user || req.user.role !== role) {
            return res.status(403).json({
                message: "Access denied. You do not have permission to access this resource."
            });
        }
        next();
    };
};

module.exports = {
    authenticateToken,
    requireRole
};