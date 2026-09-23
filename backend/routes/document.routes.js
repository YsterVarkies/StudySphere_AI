const express = require("express");

const router = express.Router();

const {
    authenticateToken
} = require("../middleware/auth.middleware");

const {
    getDocuments,
    getDocument,
    createDocument
} = require("../controllers/document.controller");

// Get all documents for the logged-in user
router.get("/", authenticateToken, getDocuments);

// Get one document for the logged-in user
router.get("/:id", authenticateToken, getDocument);

// Create a document for the logged-in user
router.post("/", authenticateToken, createDocument);

module.exports = router;