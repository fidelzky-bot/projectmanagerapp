const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');
const notificationSettingsController = require('../controllers/notificationSettingsController');

// Get all notifications for the authenticated user
router.get('/', auth, notificationController.getNotifications);
// Mark a notification as read
router.patch('/:id/read', auth, notificationController.markAsRead);
// Notification settings for a project (per-role)
router.get('/settings/:projectId', auth, notificationSettingsController.getSettings);
router.put('/settings/:projectId', auth, notificationSettingsController.updateSettings);

module.exports = router;