const Notification = require('../models/Notification');
const NotificationSettings = require('../models/NotificationSettings');
const { io } = require('../server');

// Get all notifications for the authenticated user
async function getNotifications(req, res) {
  try {
    const notifications = await Notification.find({ user: req.mongoUser._id }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Mark a notification as read
async function markAsRead(req, res) {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    res.json(notification);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// Utility: Send notifications to all users in the relevant notification settings array
async function sendProjectNotifications({ type, message, entityId, entityType, projectId, byUser, extra = {} }) {
  try {
    console.log('sendProjectNotifications called:', { type, projectId, message, entityId, entityType, byUser, extra });
    const settings = await NotificationSettings.findOne({ projectId });
    console.log('NotificationSettings found:', settings);
    if (!settings) return;
    let userIds = [];
    if (type === 'statusUpdates') {
      userIds = settings.statusUpdates || [];
    } else if (type === 'tasksAdded') {
      userIds = settings.tasksAdded || [];
    } else if (type === 'messages') {
      userIds = settings.messages || [];
    } else if (type === 'comments') {
      userIds = settings.comments || [];
    }
    console.log('User IDs to notify:', userIds);
    for (const userId of userIds) {
      const notification = await Notification.create({
        user: userId,
        type,
        message,
        entityId,
        entityType,
        ...extra
      });
      io.emit('notification:new', notification);
    }
  } catch (err) {
    console.error('Error sending project notifications:', err);
  }
}

module.exports = {
  getNotifications,
  markAsRead,
  sendProjectNotifications
};