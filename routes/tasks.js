const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const auth = require('../middleware/auth');
const Task = require('../models/Task');

// Create a task (protected)
router.post('/', (req, res, next) => {
  console.log('POST /api/tasks hit');
  next();
}, auth, async (req, res) => {
  const { title, description, project } = req.body;
  const task = await Task.create({
    title,
    description,
    project,
    owner: req.user.userId
  });
  res.status(201).json(task);
});

// Get all tasks for the current user (protected)
router.get('/', auth, async (req, res) => {
  const tasks = await Task.find({ owner: req.user.userId });
  res.json(tasks);
});

// Get a single task by ID
router.get('/:id', taskController.getTaskById);
// Update a task
router.put('/:id', taskController.updateTask);
// Delete a task
router.delete('/:id', taskController.deleteTask);

module.exports = router;