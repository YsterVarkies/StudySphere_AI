
const express = require("express");

const router = express.Router();

const {
    testAuth,
    register,
    login
} = require("../controllers/auth.controller");

router.get("/test", testAuth);
router.post("/register", register);
router.post("/login", login);

module.exports = router;