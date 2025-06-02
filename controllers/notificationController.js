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

// Utility: Create a notification (for use in other controllers)
async function createNotification({ user, type, message, entityId, entityType, projectId, fromUser }) {
  try {
    // Get notification settings for the recipient
    const settings = await NotificationSettings.findOne({ userId: user, projectId });
    
    // Check if the recipient wants notifications from this user
    if (fromUser) {
      const shouldNotify = settings?.teamMemberPreferences?.find(
        pref => pref.memberId.toString() === fromUser.toString()
      )?.receiveNotifications;
      
      if (shouldNotify === false) {
        return null; // Don't send notification if user has disabled notifications from this member
      }
    }
    
    // Check if the notification type is enabled in settings
    if (settings) {
      const typeEnabled = {
        'status': settings.statusUpdates,
        'message': settings.messages,
        'task': settings.tasksAdded,
        'comment': settings.comments
      }[type];
      
      if (typeEnabled === false) {
        return null; // Don't send notification if this type is disabled
      }
    }
    
    const notification = await Notification.create({ user, type, message, entityId, entityType });
    io.emit('notification:new', notification);
    return notification;
  } catch (err) {
    console.error('Error creating notification:', err);
    return null;
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
    if (type === 'statusUpdates' || type === 'tasksAdded') {
      // Both use the same recipients
      userIds = Array.from(new Set([...(settings.statusUpdates || []), ...(settings.tasksAdded || [])]));
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
  createNotification,
  sendProjectNotifications
};