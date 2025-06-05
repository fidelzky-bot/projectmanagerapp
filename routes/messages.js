const express = require('express');
const router = express.Router();
const clerkAuth = require('../middleware/auth');
const syncUser = require('../middleware/syncUser');
const messageController = require('../controllers/messageController');
const Message = require('../models/Message');

// Send a new message
router.post('/', clerkAuth, syncUser, messageController.sendMessage);

// Get conversation with a user
router.get('/conversation/:userId', clerkAuth, syncUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const otherUserId = req.params.userId;
    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId }
      ]
    })
      .sort('createdAt')
      .populate('sender', 'name email avatar')
      .populate('receiver', 'name email avatar');
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Mark messages as read
router.post('/read/:senderId', clerkAuth, syncUser, messageController.markAsRead);

// Get unread message count
router.get('/unread', clerkAuth, syncUser, messageController.getUnreadCount);

// Get unread-count
router.get('/unread-count', clerkAuth, syncUser, messageController.getUnreadCount);

// Get recent conversations (last month)
router.get('/conversations/recent', clerkAuth, syncUser, messageController.getRecentConversations);

module.exports = router; 