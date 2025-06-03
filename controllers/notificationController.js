const Notification = require('../models/Notification');
const NotificationSettings = require('../models/NotificationSettings');
const { io } = require('../server');
const ProjectUserRole = require('../models/ProjectUserRole');

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
    if (!settings || !settings.roles) return;
    // Find all users and their roles for this project
    const roles = await ProjectUserRole.find({ projectId });
    let userIds = [];
    for (const roleEntry of roles) {
      const userRole = roleEntry.role;
      // Map notification type to schema key
      let notifKey = null;
      if (type === 'statusUpdates' || type === 'tasksEdited' || type === 'tasksMoved') notifKey = 'taskUpdates';
      else if (type === 'tasksAdded') notifKey = 'tasksAdded';
      else if (type === 'messages') notifKey = 'messages';
      else if (type === 'comments') notifKey = 'comments';
      if (notifKey && settings.roles[userRole] && settings.roles[userRole][notifKey]) {
        userIds.push(roleEntry.userId.toString());
      }
    }
    // Remove the user who triggered the action (optional)
    if (byUser) userIds = userIds.filter(id => id !== byUser.toString());
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

// Role-based notification sending
async function sendRoleBasedNotifications({ type, message, entityId, entityType, projectId, byUser, extra = {} }) {
  const roles = await ProjectUserRole.find({ projectId });
  let userIds = [];
  if (type === 'comments') {
    userIds = roles.filter(
      r => r.role === 'commenter' || (r.role === 'admin' && r.notifyAll)
    ).map(r => r.userId.toString());
  } else if (type === 'messages') {
    userIds = roles.filter(
      r => r.role === 'editor' || r.role === 'commenter' || (r.role === 'admin' && r.notifyAll)
    ).map(r => r.userId.toString());
  } else if (
    type === 'tasksMoved' ||
    type === 'tasksEdited' ||
    type === 'tasksAdded'
  ) {
    userIds = roles.filter(
      r => r.role === 'editor' || (r.role === 'admin' && r.notifyAll)
    ).map(r => r.userId.toString());
  } else if (type === 'adminOnly') {
    userIds = roles.filter(r => r.role === 'admin' && r.notifyAll).map(r => r.userId.toString());
  }
  // Remove the user who triggered the action (optional)
  if (byUser) userIds = userIds.filter(id => id !== byUser.toString());
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
}

module.exports = {
  getNotifications,
  markAsRead,
  sendProjectNotifications,
  sendRoleBasedNotifications
};