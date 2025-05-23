const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const auth = require('../middleware/auth');
const Task = require('../models/Task');

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

module.exports = router;