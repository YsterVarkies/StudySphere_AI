const express = require("express");

const router = express.Router();

const {
    getDocuments,
    createDocument
} = require("../controllers/document.controller");

router.get("/", getDocuments);
router.post("/", createDocument);

module.exports = router;