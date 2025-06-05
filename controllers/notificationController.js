const Notification = require('../models/Notification');
const NotificationSettings = require('../models/NotificationSettings');
const { io } = require('../server');
const ProjectUserRole = require('../models/ProjectUserRole');
const User = require('../models/User');

// Get all notifications for the authenticated user
async function getNotifications(req, res) {
  try {
    const userId = req.user?.userId || req.mongoUser?._id;
    if (!userId) return res.status(401).json({ error: 'User not authenticated' });
    const notifications = await Notification.find({ user: userId })
      .populate('sender', 'name email')
      .sort({ createdAt: -1 });
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
    ).populate('sender', 'name email');
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    res.json(notification);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// Mark all notifications as read
async function markAllAsRead(req, res) {
  try {
    const userId = req.user?.userId || req.mongoUser?._id;
    if (!userId) return res.status(401).json({ error: 'User not authenticated' });
    
    await Notification.updateMany(
      { user: userId, read: false },
      { read: true }
    );
    
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Utility: Send notifications to all users in the relevant notification settings array
async function sendProjectNotifications({ type, message, entityId, entityType, projectId, byUser, extra = {} }) {
  try {
    console.log('sendProjectNotifications called:', { type, projectId, message, entityId, entityType, byUser, extra });
    const settings = await NotificationSettings.findOne({ projectId });
    if (!settings || !settings.roles) return;

    // Get sender information
    const sender = await User.findById(byUser);
    if (!sender) {
      console.error('Sender not found:', byUser);
      return;
    }

    // Find all users and their roles for this project
    const roles = await ProjectUserRole.find({ projectId });
    let userIds = [];

    // Handle specific notification types
    switch (type) {
      case 'task_assigned':
        // Only notify the assigned user
        if (extra.assignedTo) {
          userIds = [extra.assignedTo.toString()];
        }
        break;
      case 'task_updated':
        // Notify project members based on settings
        for (const roleEntry of roles) {
          const userRole = roleEntry.role;
          if (settings.roles[userRole]?.taskUpdates) {
            userIds.push(roleEntry.userId.toString());
          }
        }
        break;
      case 'task_commented':
        // Notify project members based on settings
        for (const roleEntry of roles) {
          const userRole = roleEntry.role;
          if (settings.roles[userRole]?.comments) {
            userIds.push(roleEntry.userId.toString());
          }
        }
        break;
      case 'task_mentioned':
        // Only notify the mentioned user
        if (extra.mentionedUser) {
          userIds = [extra.mentionedUser.toString()];
        }
        break;
      default:
        // For other types, use the existing role-based logic
        for (const roleEntry of roles) {
          const userRole = roleEntry.role;
          let notifKey = null;
          if (type === 'statusUpdates' || type === 'tasksEdited' || type === 'tasksMoved') notifKey = 'taskUpdates';
          else if (type === 'tasksAdded') notifKey = 'tasksAdded';
          else if (type === 'messages') notifKey = 'messages';
          else if (type === 'comments') notifKey = 'comments';
          if (notifKey && settings.roles[userRole] && settings.roles[userRole][notifKey]) {
            userIds.push(roleEntry.userId.toString());
          }
        }
    }

    // Remove the user who triggered the action
    if (byUser) userIds = userIds.filter(id => id !== byUser.toString());
    
    // Remove duplicates
    userIds = [...new Set(userIds)];

    for (const userId of userIds) {
      const notification = await Notification.create({
        user: userId,
        type,
        message,
        entityId,
        entityType,
        sender: byUser,
        ...extra
      });
      // Populate sender before emitting
      const populatedNotification = await Notification.findById(notification._id)
        .populate('sender', 'name email');
      io.to(userId.toString()).emit('notification:new', populatedNotification);
    }
  } catch (err) {
    console.error('Error sending project notifications:', err);
  }
}

// Role-based notification sending
async function sendRoleBasedNotifications({ type, message, entityId, entityType, projectId, byUser, extra = {} }) {
  try {
    // Get sender information
    const sender = await User.findById(byUser);
    if (!sender) {
      console.error('Sender not found:', byUser);
      return;
    }

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
        sender: byUser,
        ...extra
      });
      // Populate sender before emitting
      const populatedNotification = await Notification.findById(notification._id)
        .populate('sender', 'name email');
      io.to(userId.toString()).emit('notification:new', populatedNotification);
    }
  } catch (err) {
    console.error('Error sending role-based notifications:', err);
  }
}

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  sendProjectNotifications,
  sendRoleBasedNotifications
};