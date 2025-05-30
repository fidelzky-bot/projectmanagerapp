const express = require('express');
const router = express.Router();
const clerkAuth = require('../middleware/auth');
const syncUser = require('../middleware/syncUser');
const notificationController = require('../controllers/notificationController');
const notificationSettingsController = require('../controllers/notificationSettingsController');

// Get all notifications for the authenticated user
router.get('/', clerkAuth, syncUser, notificationController.getNotifications);
// Mark a notification as read
router.patch('/:id/read', clerkAuth, syncUser, notificationController.markAsRead);
// Notification settings for a project
router.get('/settings/:projectId', clerkAuth, syncUser, notificationSettingsController.getSettings);
router.put('/settings/:projectId', clerkAuth, syncUser, notificationSettingsController.updateSettings);

module.exports = router;