const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const clerkAuth = require('../middleware/auth');
const syncUser = require('../middleware/syncUser');
const attachmentController = require('../controllers/attachmentController');

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Upload a new attachment (protected)
router.post('/', clerkAuth, syncUser, upload.single('file'), attachmentController.uploadAttachment);
// Get all attachments for a task
router.get('/', attachmentController.getAttachments);
// Download an attachment
router.get('/:id', attachmentController.downloadAttachment);

module.exports = router;