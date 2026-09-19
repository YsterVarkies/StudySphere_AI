const express = require("express");

const router = express.Router();

const { authenticateToken } = require("../middleware/auth.middleware");

const {
    register,
    login,
    logout
} = require("../controllers/auth.controller");

router.post("/register", register);

router.post("/login", login);

router.post("/logout", authenticateToken, logout);

module.exports = router;