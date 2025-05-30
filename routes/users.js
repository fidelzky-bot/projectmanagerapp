const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const syncUser = require('../middleware/syncUser');
const userController = require('../controllers/userController');
const User = require('../models/User');
const Project = require('../models/Project');

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
  const { name, contact } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user.userId,
    { name, contact },
    { new: true }
  ).select('-password');
  res.json(user);
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