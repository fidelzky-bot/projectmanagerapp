const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const syncUser = require('../middleware/syncUser');
const userController = require('../controllers/userController');
const User = require('../models/User');
const Project = require('../models/Project');
const multer = require('multer');
const path = require('path');

// Get current authenticated user (from MongoDB)
router.get('/me', auth, async (req, res) => {
  // Update lastActive
  await User.findByIdAndUpdate(req.user.userId, { lastActive: new Date() });
  const user = await User.findById(req.user.userId).select('-password');
  res.json({ user });
});

// Get current user profile
router.get('/me', auth, async (req, res) => {
  // Update lastActive
  await User.findByIdAndUpdate(req.user.userId, { lastActive: new Date() });
  const user = await User.findById(req.user.userId).select('-password');
  res.json(user);
});

// Update current user profile
router.put('/me', auth, async (req, res) => {
  const { name, contact, avatar, jobTitle, bio, birthday, status } = req.body;
  const update = { name, contact, jobTitle, bio, birthday };
  if (avatar !== undefined) update.avatar = avatar;
  if (status !== undefined) update.status = status;
  const user = await User.findByIdAndUpdate(
    req.user.userId,
    update,
    { new: true }
  ).select('-password');
  res.json(user);
});

// Avatar upload endpoint (expects multipart/form-data)
const upload = multer({
  dest: path.join(__dirname, '../uploads/avatars'),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'));
    }
    cb(null, true);
  }
});

router.post('/me/avatar', auth, upload.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  // Save the file path (relative to /uploads/avatars)
  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  await User.findByIdAndUpdate(req.user.userId, { avatar: avatarUrl });
  res.json({ avatar: avatarUrl });
});

// Get all users (for assignee dropdown)
router.get('/', async (req, res) => {
  try {
    const users = await User.find({}, 'name email');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get users for a specific project
router.get('/byProject/:projectId', async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId).populate('members', 'name email lastActive');
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project.members);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

module.exports = router;