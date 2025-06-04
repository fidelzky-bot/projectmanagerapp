const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const File = require('../models/File');
const User = require('../models/User');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    // List of common file types
    const imageFormats = ['jpg','jpeg','png','gif','webp','bmp','tiff','svg','ico'];
    const documentFormats = ['pdf','doc','docx','xls','xlsx','ppt','pptx','txt','rtf','csv','odt','ods','odp','md','log'];
    const archiveFormats = ['zip','rar','7z','tar','gz','bz2'];
    const audioFormats = ['mp3','wav','ogg','aac','flac','m4a'];
    const videoFormats = ['mp4','avi','mov','wmv','flv','mkv','webm','mpeg','3gp'];
    const otherFormats = ['json','xml','html','htm'];
    const allFormats = [
      ...imageFormats,
      ...documentFormats,
      ...archiveFormats,
      ...audioFormats,
      ...videoFormats,
      ...otherFormats
    ];
    let resourceType = 'auto';
    if ([...documentFormats, ...archiveFormats, ...otherFormats].includes(ext)) {
      resourceType = 'raw';
    } else if (audioFormats.includes(ext)) {
      resourceType = 'video'; // Cloudinary treats audio as video
    } else if (videoFormats.includes(ext)) {
      resourceType = 'video';
    } else if (imageFormats.includes(ext)) {
      resourceType = 'image';
    }
    return {
      folder: 'project_files',
      allowed_formats: allFormats,
      resource_type: resourceType,
    };
  }
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB

// POST /api/files - upload a file
router.post('/', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.path) return res.status(400).json({ error: 'No file uploaded' });
    const file = new File({
      filename: req.file.originalname,
      url: req.file.path,
      uploader: req.user.userId,
      uploadedAt: new Date()
    });
    await file.save();
    await file.populate('uploader', 'name email');
    res.status(201).json(file);
  } catch (err) {
    // Improved error logging
    console.error('File upload error:', JSON.stringify(err, null, 2));
    res.status(500).json({ error: 'Failed to upload file', details: err.message, stack: err.stack });
  }
});

// GET /api/files - list all files
router.get('/', auth, async (req, res) => {
  try {
    const files = await File.find().populate('uploader', 'name email').sort({ uploadedAt: -1 });
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

module.exports = router; 