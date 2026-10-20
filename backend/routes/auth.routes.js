const express = require("express");

const router = express.Router();

const { authenticateToken } = require("../middleware/auth.middleware");

const {
    register,
    login,
    logout
} = require("../controllers/auth.controller");

const {
    forgotPassword,
    resetPassword
} = require("../controllers/password-reset.controller");

router.post("/register", register);

router.post("/login", login);

router.post("/logout", authenticateToken, logout);

// Password reset
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;