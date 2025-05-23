const Task = require('../models/Task');
const { io } = require('../server');
const User = require('../models/User');

// Create a new task
async function createTask(req, res) {
  try {
    console.log('Received body:', req.body);
    const { title, description, dueDate, priority, assignedTo, project, status, attachments } = req.body;
    if (!project) {
      return res.status(400).json({ error: 'Project is required' });
    }
    // Just use assignedTo from the request body
    const assignedUser = assignedTo || null;
    const task = new Task({
      title,
      description,
      dueDate: dueDate || undefined,
      priority: priority || undefined,
      assignedTo: assignedUser || undefined,
      project,
      status: status || undefined,
      owner: req.user.userId,
      attachments
    });
    await task.save();
    await task.populate('assignedTo project');
    const creator = await User.findById(req.user.userId);
    io.emit('notification', {
      type: 'created',
      taskId: task._id,
      title: task.title,
      by: req.user.userId,
      byName: creator ? creator.name : 'User',
      time: new Date(),
      project: task.project._id || task.project
    });
    io.emit('task:updated', task);
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// Get all tasks (optionally filter by project)
async function getTasks(req, res) {
  try {
    const filter = {};
    if (req.query.project) {
      filter.project = req.query.project;
    }
    const tasks = await Task.find(filter).populate('assignedTo project');
    console.log('Populated tasks:', tasks);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get a single task by ID
async function getTaskById(req, res) {
  try {
    const task = await Task.findById(req.params.id).populate('assignedTo project');
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Update a task
async function updateTask(req, res) {
  try {
    const { title, description, dueDate, priority, assignedTo, status, attachments } = req.body;
    const oldTask = await Task.findById(req.params.id);
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { title, description, dueDate, priority, assignedTo, status, attachments },
      { new: true }
    ).populate('assignedTo project');
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const updater = await User.findById(req.user.userId);
    // Determine if only status changed
    let notificationType = 'edited';
    if (oldTask && oldTask.status !== status &&
        oldTask.title === title &&
        oldTask.description === description &&
        String(oldTask.dueDate) === String(dueDate) &&
        oldTask.priority === priority &&
        String(oldTask.assignedTo) === String(assignedTo)) {
      notificationType = 'moved';
    }
    io.emit('notification', {
      type: notificationType,
      taskId: task._id,
      title: task.title,
      by: req.user.userId,
      byName: updater ? updater.name : 'User',
      time: new Date(),
      project: task.project._id || task.project,
      status: task.status
    });
    io.emit('task:updated', task);
    res.json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// Delete a task
async function deleteTask(req, res) {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const deleter = await User.findById(req.user.userId);
    io.emit('notification', {
      type: 'deleted',
      taskId: task._id,
      title: task.title,
      by: req.user.userId,
      byName: deleter ? deleter.name : 'User',
      time: new Date(),
      project: task.project._id || task.project
    });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask
};