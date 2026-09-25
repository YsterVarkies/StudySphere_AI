const multer = require("multer");

// Store uploaded files temporarily in memory
const upload = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize: 25 * 1024 * 1024
    },

    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain"
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only PDF, DOCX, and TXT files are allowed."));
        }
    }
});

module.exports = upload;