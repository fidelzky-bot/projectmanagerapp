const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const auth = require('../middleware/auth');
const Task = require('../models/Task');
const Comment = require('../models/Comment');
const { io } = require('../server');
const User = require('../models/User');

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
// Update a task
router.put('/:id', taskController.updateTask);
// Delete a task
router.delete('/:id', taskController.deleteTask);

// Add a comment to a task
router.post('/:taskId/comments', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Comment text is required' });
    const comment = await Comment.create({
      text,
      task: req.params.taskId,
      author: req.user.userId, // or whatever field you use for user
      createdAt: new Date()
    });
    // Emit notification
    const user = await User.findById(req.user.userId);
    const task = await Task.findById(req.params.taskId);
    io.emit('notification', {
      type: 'commented',
      taskId: comment.task,
      title: task ? task.title : '',
      by: req.user.userId,
      byName: user ? user.name : 'User',
      time: new Date(),
      project: task && (task.project._id || task.project)
    });
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

module.exports = router;