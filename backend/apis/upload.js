const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../middleware/auth');


// Configure Multer Storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadPath = path.join(__dirname, '../../frontend/images/avatars'); // Default to avatars

        if (req.query.type === 'background') {
            uploadPath = path.join(__dirname, '../../frontend/images/backgrounds');
        } else if (req.query.type === 'ads' || req.query.type === 'media') {
            uploadPath = path.join(__dirname, '../../frontend/uploads');
        }

        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const username = req.user ? req.user.username : 'guest';
        cb(null, `${username}_${Date.now()}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

module.exports = function (app) {
    // Upload Endpoint
    app.post('/api/upload', requireAuth, upload.single('file'), (req, res) => {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const type = req.query.type || 'avatar';
        let folder = 'images/avatars';

        if (type === 'background') {
            folder = 'images/backgrounds';
        } else if (type === 'ads' || type === 'media') {
            folder = 'uploads';
        }

        const relativePath = `${folder}/${req.file.filename}`;

        res.json({
            success: true,
            path: relativePath
        });
    });
};
