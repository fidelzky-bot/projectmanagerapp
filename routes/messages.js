const express = require('express');
const router = express.Router();
const clerkAuth = require('../middleware/auth');
const syncUser = require('../middleware/syncUser');
const messageController = require('../controllers/messageController');

// Send a new message
router.post('/', clerkAuth, syncUser, messageController.sendMessage);

// Get conversation with a user
router.get('/conversation/:userId', clerkAuth, syncUser, messageController.getConversation);

// Mark messages as read
router.post('/read/:senderId', clerkAuth, syncUser, messageController.markAsRead);

// Get unread message count
router.get('/unread', clerkAuth, syncUser, messageController.getUnreadCount);

module.exports = router; 