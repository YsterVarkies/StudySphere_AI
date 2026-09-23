const Document = require("../models/document.model");

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

// Create a document
const createDocument = async (req, res) => {
    try {
        const userId = req.user.user_id;

        const {
            title,
            module_id,
            file_path,
            file_type,
            file_size,
            openai_file_id
        } = req.body;

        // Check required fields
        if (
            !title ||
            !module_id ||
            !file_path ||
            file_size === undefined
        ) {
            return res.status(400).json({
                message: "Please provide title, module ID, file path, and file size."
            });
        }

        const result = await Document.createDocument(
            userId,
            module_id,
            title,
            file_path,
            file_type,
            file_size,
            openai_file_id
        );

        return res.status(201).json({
            message: "Document created successfully.",
            document: {
                document_id: result.insertId,
                user_id: userId,
                module_id,
                title,
                file_path,
                file_type: file_type || null,
                file_size,
                openai_file_id: openai_file_id || null
            }
        });

    } catch (error) {
        console.error("Document creation error:", error);

        return res.status(500).json({
            message: "Server error while creating document."
        });
    }
};

module.exports = {
    getDocuments,
    getDocument,
    createDocument
};