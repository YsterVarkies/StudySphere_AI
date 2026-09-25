const express = require("express");
const multer = require("multer");

const router = express.Router();

const {
    authenticateToken
} = require("../middleware/auth.middleware");

const upload = require("../middleware/upload.middleware");

const {
    getDocuments,
    getDocument,
    createDocument,
    downloadDocument
} = require("../controllers/document.controller");

// Get all documents for the logged-in user
router.get("/", authenticateToken, getDocuments);

// Get one document for the logged-in user
router.get(
    "/:id/download",
    authenticateToken,
    downloadDocument
);

// Create a document for the logged-in user
router.post(
    "/",
    authenticateToken,
    (req, res, next) => {
        upload.single("file")(req, res, (error) => {
            if (error instanceof multer.MulterError) {
                if (error.code === "LIMIT_FILE_SIZE") {
                    return res.status(400).json({
                        message: "File size cannot exceed 25 MB."
                    });
                }

                return res.status(400).json({
                    message: error.message
                });
            }

            if (error) {
                return res.status(400).json({
                    message: error.message
                });
            }

            next();
        });
    },
    createDocument
);

module.exports = router;