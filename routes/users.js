const express = require('express');
const router = express.Router();
const clerkAuth = require('../middleware/auth');
const syncUser = require('../middleware/syncUser');
const userController = require('../controllers/userController');

// Get current authenticated user (from MongoDB)
router.get('/me', clerkAuth, syncUser, userController.getMe);

module.exports = router;