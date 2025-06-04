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
    const { text, task } = req.body;
    if (!task) return res.status(400).json({ error: 'Task is required' });
    // Find the project for the task
    const taskDoc = await require('../models/Task').findById(task);
    if (!taskDoc) return res.status(404).json({ error: 'Task not found' });
    const userRole = await getUserRole(req.mongoUser?._id || req.user.userId, taskDoc.project);
    if (!['admin', 'editor', 'commenter'].includes(userRole)) {
      return res.status(403).json({ error: 'You do not have permission to comment.' });
    }
    const author = req.mongoUser?._id || req.user.userId;
    // Parse mentions from text (e.g., @username)
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    let match;
    const mentionedUsernames = [];
    while ((match = mentionRegex.exec(text)) !== null) {
      mentionedUsernames.push(match[1]);
    }
    console.log('Mentioned usernames:', mentionedUsernames);
    // Find mentioned users in DB (case-insensitive)
    const User = require('../models/User');
    const allUsers = await User.find({});
    console.log('All users in DB:', allUsers.map(u => u.name));
    const mentionedUsers = mentionedUsernames.length
      ? await User.find({
          $or: mentionedUsernames.map(username => ({
            name: { $regex: `^${username}$`, $options: 'i' }
          }))
        })
      : [];
    console.log('Mentioned users found:', mentionedUsers.map(u => u.name));
    const mentions = mentionedUsers.map(u => u._id);
    const comment = new Comment({ text, author, task, mentions });
    await comment.save();
    await comment.populate('author');
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
      io.emit('notification:new', {
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
    const comments = await Comment.find({ task: taskId }).populate('author');
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