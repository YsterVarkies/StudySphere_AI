
const express = require("express");

const router = express.Router();

const {
    testAuth,
    register
} = require("../controllers/auth.controller");

router.get("/test", testAuth);

router.post("/register", register);

module.exports = router;