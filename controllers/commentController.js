const Comment = require('../models/Comment');
const { io } = require('../server');
const ProjectUserRole = require('../models/ProjectUserRole');
const { sendRoleBasedNotifications, sendProjectNotifications } = require('./notificationController');
const Notification = require('../models/Notification');

// Helper to get user role for a project
async function getUserRole(userId, projectId) {
  const role = await ProjectUserRole.findOne({ userId, projectId });
  return role ? role.role : 'viewer';
}

// Create a new comment
async function createComment(req, res) {
  console.log('createComment called, body:', req.body);
  try {
    const { text, task, mentions } = req.body;
    if (!task) return res.status(400).json({ error: 'Task is required' });
    // Find the project for the task
    const taskDoc = await require('../models/Task').findById(task);
    if (!taskDoc) return res.status(404).json({ error: 'Task not found' });
    const userRole = await getUserRole(req.mongoUser?._id || req.user.userId, taskDoc.project);
    if (!['admin', 'editor', 'commenter'].includes(userRole)) {
      return res.status(403).json({ error: 'You do not have permission to comment.' });
    }
    const author = req.mongoUser?._id || req.user.userId;
    // Use mentions array from request body
    const User = require('../models/User');
    let mentionedUsers = [];
    if (Array.isArray(mentions) && mentions.length > 0) {
      mentionedUsers = await User.find({ _id: { $in: mentions } });
    }
    const comment = new Comment({ text, author, task, mentions: Array.isArray(mentions) ? mentions : [] });
    await comment.save();
    await comment.populate('author', 'name avatar');
    // Notify commenters and admins (if opted in)
    await sendRoleBasedNotifications({
      type: 'comments',
      message: `New comment on task: ${taskDoc.title || ''}`,
      entityId: comment._id,
      entityType: 'Comment',
      projectId: taskDoc.project,
      byUser: author,
      extra: {
        action: 'commented',
        taskId: taskDoc._id,
        title: taskDoc.title || '',
        by: author,
        byName: comment.author?.name || 'User',
        time: new Date(),
        project: taskDoc.project
      }
    });
    // Notify mentioned users (in-app notification)
    for (const user of mentionedUsers) {
      console.log('[Mention Debug] Creating mention notification for:', user.name);
      const notif = await Notification.create({
        user: user._id,
        type: 'task_mentioned',
        message: `${comment.author?.name || 'Someone'} mentioned you in ${taskDoc.title}`,
        entityId: taskDoc._id,
        entityType: 'Task',
        projectName: taskDoc.project.name || '',
        taskTitle: taskDoc.title,
        sender: author
      });
      io.to(user._id.toString()).emit('notification:new', {
        ...notif.toObject(),
        sender: { _id: author, name: comment.author?.name || 'Someone' }
      });
    }
    io.emit('comment:new', comment);
    res.status(201).json(comment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// Get all comments for a task
async function getComments(req, res) {
  try {
    const { taskId } = req.query;
    if (!taskId) return res.status(400).json({ error: 'taskId is required' });
    const comments = await Comment.find({ task: taskId }).populate('author', 'name avatar');
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Delete a comment
async function deleteComment(req, res) {
  try {
    const comment = await Comment.findByIdAndDelete(req.params.id);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createComment,
  getComments,
  deleteComment
};