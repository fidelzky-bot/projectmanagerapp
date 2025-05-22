const express = require('express');
const router = express.Router();
const clerkAuth = require('../middleware/auth');
const syncUser = require('../middleware/syncUser');
const userController = require('../controllers/userController');
const User = require('../models/User');

// Get current authenticated user (from MongoDB)
router.get('/me', clerkAuth, syncUser, userController.getMe);

// Get current user profile
router.get('/me', clerkAuth, async (req, res) => {
  const user = await User.findById(req.user.userId).select('-password');
  res.json(user);
});

// Update current user profile
router.put('/me', clerkAuth, async (req, res) => {
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

module.exports = router;