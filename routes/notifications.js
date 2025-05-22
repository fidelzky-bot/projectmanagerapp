const express = require('express');
const router = express.Router();
const clerkAuth = require('../middleware/auth');
const syncUser = require('../middleware/syncUser');
const notificationController = require('../controllers/notificationController');

// Get all notifications for the authenticated user
router.get('/', clerkAuth, syncUser, notificationController.getNotifications);
// Mark a notification as read
router.patch('/:id/read', clerkAuth, syncUser, notificationController.markAsRead);

module.exports = router;