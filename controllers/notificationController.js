const Notification = require('../models/Notification');
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

// Utility: Create a notification (for use in other controllers)
async function createNotification({ user, type, message, entityId, entityType }) {
  const notification = await Notification.create({ user, type, message, entityId, entityType });
  io.emit('notification:new', notification);
  return notification;
}

module.exports = {
  getNotifications,
  markAsRead,
  createNotification
};