const Document = require("../models/document.model");
const db = require("../config/db");
const storage = require("../config/storage");
const {
    PutObjectCommand,
    GetObjectCommand
} = require("@aws-sdk/client-s3");
const crypto = require("crypto");

// Get all documents for the logged-in user
const getDocuments = async (req, res) => {
    try {
        const userId = req.user.user_id;

        const documents = await Document.getDocumentsByUser(userId);

        return res.status(200).json({
            message: "Documents retrieved successfully.",
            documents
        });

    } catch (error) {
        console.error("Document retrieval error:", error);

        return res.status(500).json({
            message: "Server error while retrieving documents."
        });
    }
};

// Get one document for the logged-in user
const getDocument = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const documentId = req.params.id;

        const document = await Document.getDocumentById(
            documentId,
            userId
        );

        if (!document) {
            return res.status(404).json({
                message: "Document not found."
            });
        }

        return res.status(200).json({
            message: "Document retrieved successfully.",
            document
        });

    } catch (error) {
        console.error("Document retrieval error:", error);

        return res.status(500).json({
            message: "Server error while retrieving document."
        });
    }
};

// Create and upload a document
const createDocument = async (req, res) => {
    try {
        const userId = req.user.user_id;

        // Check that a file was uploaded
        if (!req.file) {
            return res.status(400).json({
                message: "Please upload a document."
            });
        }

        const {
            title,
            moduleId
        } = req.body;

        // Check required fields
        if (!title || !moduleId) {
            return res.status(400).json({
                message: "Please provide a title and module ID."
            });
        }

        
        // Validate the module ID
        const parsedModuleId = Number(moduleId);

        if (!Number.isInteger(parsedModuleId) || parsedModuleId <= 0) {
            return res.status(400).json({
                message: "Please provide a valid module ID."
            });
        }

        // Confirm that the module exists
        const [moduleRows] = await db.query(
            `SELECT module_id
             FROM \`MODULE\`
             WHERE module_id = ?`,
            [parsedModuleId]
        );

        if (moduleRows.length === 0) {
            return res.status(404).json({
                message: "The selected module does not exist."
            });
        }

        // Students may upload only to modules assigned to their cohort
        if (req.user.role === "student") {
            const [accessRows] = await db.query(
                `SELECT m.module_id
                 FROM \`USER\` u
                 INNER JOIN COHORT_MODULE cm
                     ON cm.cohort_id = u.cohort_id
                 INNER JOIN \`MODULE\` m
                     ON m.module_id = cm.module_id
                 WHERE u.user_id = ?
                   AND u.role = 'student'
                   AND m.module_id = ?
                 LIMIT 1`,
                [userId, parsedModuleId]
            );

            if (accessRows.length === 0) {
                return res.status(403).json({
                    message: "You do not have access to this module."
                });
            }
        }


        const file = req.file;

        // Create a unique file name
        const fileExtension = file.originalname.includes(".")
            ? file.originalname.substring(
                file.originalname.lastIndexOf(".")
            )
            : "";

        const fileName = `${crypto.randomUUID()}${fileExtension}`;

        // Store files inside a user-specific folder
        const filePath = `documents/${userId}/${fileName}`;

        // Upload file to Backblaze B2
        await storage.send(
            new PutObjectCommand({
                Bucket: process.env.B2_BUCKET_NAME,
                Key: filePath,
                Body: file.buffer,
                ContentType: file.mimetype
            })
        );

        // Store document metadata in MySQL
        const result = await Document.createDocument(
            userId,
            parsedModuleId,
            title,
            filePath,
            file.mimetype,
            file.size,
            null
        );

        return res.status(201).json({
            message: "Document uploaded successfully.",
            document: {
                document_id: result.insertId,
                user_id: userId,
                module_id: Number(moduleId),
                title,
                file_path: filePath,
                file_type: file.mimetype,
                file_size: file.size,
                openai_file_id: null
            }
        });

    } catch (error) {
        console.error("Document upload error:", error);

        return res.status(500).json({
            message: "Server error while uploading document."
        });
    }
};

// Download a document for the logged-in user
const downloadDocument = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const documentId = req.params.id;

        // Get document and verify it belongs to the logged-in user
        const document = await Document.getDocumentById(
            documentId,
            userId
        );

        if (!document) {
            return res.status(404).json({
                message: "Document not found."
            });
        }

        // Get the file from Backblaze B2
        const result = await storage.send(
            new GetObjectCommand({
                Bucket: process.env.B2_BUCKET_NAME,
                Key: document.file_path
            })
        );

        // Set response headers
        res.setHeader(
            "Content-Type",
            document.file_type || "application/octet-stream"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${document.title}"`
        );

        // Send the file to the frontend
        result.Body.pipe(res);

    } catch (error) {
        console.error("Document download error:", error);

        return res.status(500).json({
            message: "Server error while downloading document."
        });
    }
};

module.exports = {
    getDocuments,
    getDocument,
    createDocument,
    downloadDocument
};