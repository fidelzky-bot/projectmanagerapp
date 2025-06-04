const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const auth = require('../middleware/auth');
const Task = require('../models/Task');
const Comment = require('../models/Comment');
const { io } = require('../server');
const User = require('../models/User');
const { sendProjectNotifications } = require('../controllers/notificationController');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'task_attachments',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv', 'zip', 'rar'],
    resource_type: 'auto',
  },
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB

// Create a task (protected)
router.post('/', (req, res, next) => {
  console.log('POST /api/tasks hit');
  next();
}, auth, taskController.createTask);

// Get all tasks for a project
router.get('/', auth, async (req, res) => {
  const { project } = req.query;
  const filter = {};
  if (project) filter.project = project;
  // Optionally: check if user is a member of the project here
  const tasks = await Task.find(filter).populate('assignedTo project');
  res.json(tasks);
});

// Get a single task by ID
router.get('/:id', taskController.getTaskById);
// Update a task (protected)
router.put('/:id', auth, taskController.updateTask);
// Delete a task (protected)
router.delete('/:id', auth, taskController.deleteTask);

// Add a comment to a task
router.post('/:taskId/comments', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Comment text is required' });
    // --- Mention extraction and debug logs ---
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    let match;
    const mentionedUsernames = [];
    while ((match = mentionRegex.exec(text)) !== null) {
      mentionedUsernames.push(match[1]);
    }
    const allUsers = await User.find({});
    console.log('All users in DB:', allUsers.map(u => u.name));
    console.log('Mentioned usernames:', mentionedUsernames);
    const mentionedUsers = mentionedUsernames.length
      ? await User.find({
          $or: mentionedUsernames.map(username => ({
            name: { $regex: `^${username}$`, $options: 'i' }
          }))
        })
      : [];
    console.log('Mentioned users found:', mentionedUsers.map(u => u.name));
    const mentions = mentionedUsers.map(u => u._id);
    // --- End mention extraction ---
    const comment = await Comment.create({
      text,
      task: req.params.taskId,
      author: req.user.userId,
      createdAt: new Date(),
      mentions
    });
    // Notify users for comments
    const user = await User.findById(req.user.userId);
    const task = await Task.findById(req.params.taskId);
    await sendProjectNotifications({
      type: 'comments',
      message: `New comment on task: ${task ? task.title : ''}`,
      entityId: comment.task,
      entityType: 'Task',
      projectId: task && (task.project._id || task.project),
      byUser: req.user.userId,
      extra: {
        action: 'commented',
        taskId: comment.task,
        title: task ? task.title : '',
        by: req.user.userId,
        byName: user ? user.name : 'User',
        time: new Date(),
        project: task && (task.project._id || task.project)
      }
    });
    // Mention notifications
    const Notification = require('../models/Notification');
    for (const mentionedUser of mentionedUsers) {
      await Notification.create({
        user: mentionedUser._id,
        type: 'mention',
        message: `${user?.name || 'Someone'} mentioned you in Task ${task ? task.title : ''}`,
        entityId: task ? task._id : null,
        entityType: 'Task',
        byName: user?.name || 'User',
        action: 'mentioned',
        title: task ? task.title : '',
        time: new Date()
      });
    }
    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// (Optional) Get comments for a task
router.get('/:taskId/comments', auth, async (req, res) => {
  try {
    const comments = await Comment.find({ task: req.params.taskId }).populate('author', 'name email');
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Upload attachment to a task
router.post('/:id/attachments', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.path) return res.status(400).json({ error: 'No file uploaded' });
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const attachment = {
      filename: req.file.originalname,
      url: req.file.path,
      uploader: req.user.userId,
      uploadedAt: new Date()
    };
    task.attachments.push(attachment);
    await task.save();
    res.status(201).json(attachment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload attachment' });
  }
});

// Delete attachment from a task
router.delete('/:id/attachments/:attachmentId', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const attachment = task.attachments.id(req.params.attachmentId);
    if (!attachment) return res.status(404).json({ error: 'Attachment not found' });
    // Optionally: delete from Cloudinary using public_id (parse from url)
    attachment.remove();
    await task.save();
    res.json({ message: 'Attachment deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete attachment' });
  }
});

module.exports = router;