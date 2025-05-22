const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const clerkAuth = require('../middleware/auth');
const syncUser = require('../middleware/syncUser');

// Create a new task (protected)
router.post('/', clerkAuth, syncUser, taskController.createTask);
// Get all tasks (optionally filter by project)
router.get('/', taskController.getTasks);
// Get a single task by ID
router.get('/:id', taskController.getTaskById);
// Update a task
router.put('/:id', taskController.updateTask);
// Delete a task
router.delete('/:id', taskController.deleteTask);

module.exports = router;