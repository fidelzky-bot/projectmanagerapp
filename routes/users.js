const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const syncUser = require('../middleware/syncUser');
const userController = require('../controllers/userController');
const User = require('../models/User');
const Project = require('../models/Project');
const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { io } = require('../server');

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cloudinary storage for Multer
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 256, height: 256, crop: 'limit' }], // Optional: limit size
  },
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

// Get current authenticated user (from MongoDB)
router.get('/me', auth, async (req, res) => {
  try {
    // Update lastActive
    await User.findByIdAndUpdate(req.user.userId, { lastActive: new Date() });
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update current user profile
router.put('/me', auth, async (req, res) => {
  const { name, phone, contact, avatar, jobTitle, bio, birthday, occupation, hobby, nickname } = req.body;
  const update = {
    name,
    contact: phone || contact, // Prefer phone if provided
    jobTitle,
    bio,
    birthday,
    occupation,
    hobby,
    nickname
  };
  if (avatar !== undefined) update.avatar = avatar;
  const user = await User.findByIdAndUpdate(
    req.user.userId,
    update,
    { new: true }
  ).select('-password');
  // Emit avatar update event
  if (avatar !== undefined && io) {
    io.emit('user:avatarUpdated', { userId: user._id, avatar: user.avatar });
  }
  res.json(user);
});

// Avatar upload endpoint
router.post('/me/avatar', auth, upload.single('avatar'), async (req, res) => {
  if (!req.file || !req.file.path) return res.status(400).json({ error: 'No file uploaded' });
  // Cloudinary returns the URL in req.file.path
  await User.findByIdAndUpdate(req.user.userId, { avatar: req.file.path });
  res.json({ avatar: req.file.path });
});

// Get all users (for assignee dropdown)
router.get('/', async (req, res) => {
  try {
    // Return all relevant profile fields
    const users = await User.find({}, 'name nickname email avatar bio occupation birthday hobby jobTitle contact lastActive');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get users for a specific project
router.get('/byProject/:projectId', async (req, res) => {
  try {
    // Populate all relevant profile fields
    const project = await Project.findById(req.params.projectId).populate('members', 'name nickname email avatar bio occupation birthday hobby jobTitle contact lastActive');
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project.members);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// Get a user by ID (all profile fields)
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

module.exports = router;