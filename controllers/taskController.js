const Task = require('../models/Task');
const { io } = require('../server');
const User = require('../models/User');
const ProjectUserRole = require('../models/ProjectUserRole');
const Notification = require('../models/Notification');
const { sendRoleBasedNotifications, sendProjectNotifications } = require('./notificationController');
const Project = require('../models/Project');

// Helper to get user role for a project
async function getUserRole(userId, projectId) {
  const role = await ProjectUserRole.findOne({ userId, projectId });
  return role ? role.role : 'viewer';
}

// Create a new task
async function createTask(req, res) {
  try {
    console.log('Received body:', req.body);
    const { title, description, dueDate, priority, assignedTo, project, status, attachments } = req.body;
    if (!project) {
      return res.status(400).json({ error: 'Project is required' });
    }
    const userRole = await getUserRole(req.user.userId, project);
    if (userRole !== 'admin' && userRole !== 'editor') {
      return res.status(403).json({ error: 'You do not have permission to create tasks.' });
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
    
    // Create notification for assigned user if any
    if (assignedUser) {
      await sendProjectNotifications({
        type: 'task_assigned',
        message: `${creator ? creator.name : 'Someone'} assigned you to ${task.title}`,
        entityId: task._id,
        entityType: 'Task',
        projectId: project,
        byUser: req.user.userId,
        extra: {
          assignedTo: assignedUser,
          taskTitle: task.title,
          byName: creator ? creator.name : 'User',
          title: task.title
        },
        byName: creator ? creator.name : 'User',
        title: task.title
      });
    }
    
    // Notify users for task added (statusUpdates + tasksAdded)
    await sendRoleBasedNotifications({
      type: 'tasksAdded',
      message: `A new task was added: ${title}`,
      entityId: task._id,
      entityType: 'Task',
      projectId: project,
      byUser: req.user.userId,
      extra: {
        action: 'created',
        taskId: task._id,
        title: task.title,
        by: req.user.userId,
        byName: creator ? creator.name : 'User',
        time: new Date(),
        project: task.project._id || task.project
      },
      byName: creator ? creator.name : 'User',
      title: task.title
    });
    // Real-time: emit to all users in the project
    io.to(project.toString()).emit('task:added', task);
    io.to(project.toString()).emit('task:updated', task);
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
    if (!oldTask) return res.status(404).json({ error: 'Task not found' });
    const userRole = await getUserRole(req.user.userId, oldTask.project);
    if (userRole !== 'admin' && userRole !== 'editor') {
      return res.status(403).json({ error: 'You do not have permission to update tasks.' });
    }
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { title, description, dueDate, priority, assignedTo, status, attachments },
      { new: true }
    ).populate('assignedTo project');
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const updater = await User.findById(req.user.userId);

    // Notification logic
    const notifications = [];
    // 1. Status changed (moved)
    if (status && oldTask.status !== status) {
      await sendRoleBasedNotifications({
        type: 'tasksMoved',
        message: `${updater ? updater.name : 'Someone'} moved ${task.title} to ${task.status}`,
        entityId: task._id,
        entityType: 'Task',
        projectId: task.project._id || task.project,
        byUser: req.user.userId,
        extra: {
          action: 'moved',
          taskId: task._id,
          title: task.title,
          by: req.user.userId,
          byName: updater ? updater.name : 'User',
          time: new Date(),
          project: task.project._id || task.project,
          status: task.status,
          oldStatus: oldTask ? oldTask.status : undefined
        },
        byName: updater ? updater.name : 'User',
        status: task.status
      });
    } else {
      // 2. Other fields changed (updated)
      await sendRoleBasedNotifications({
        type: 'tasksEdited',
        message: `${updater ? updater.name : 'Someone'} updated ${task.title}`,
        entityId: task._id,
        entityType: 'Task',
        projectId: task.project._id || task.project,
        byUser: req.user.userId,
        extra: {
          action: 'updated',
          taskId: task._id,
          title: task.title,
          by: req.user.userId,
          byName: updater ? updater.name : 'User',
          time: new Date(),
          project: task.project._id || task.project,
          status: task.status
        },
        byName: updater ? updater.name : 'User'
      });
    }
    // 3. Assignment changed
    if (assignedTo && (!oldTask.assignedTo || oldTask.assignedTo.toString() !== assignedTo)) {
      await sendProjectNotifications({
        type: 'task_assigned',
        message: `${updater ? updater.name : 'Someone'} assigned you to ${task.title}`,
        entityId: task._id,
        entityType: 'Task',
        projectId: task.project._id || task.project,
        byUser: req.user.userId,
        extra: {
          assignedTo,
          taskTitle: task.title,
          byName: updater ? updater.name : 'User',
          title: task.title
        },
        byName: updater ? updater.name : 'User',
        title: task.title
      });
    }
    // Real-time: emit to all users in the project
    io.to((task.project._id || task.project).toString()).emit('task:updated', task);
    res.json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// Delete a task
async function deleteTask(req, res) {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const userRole = await getUserRole(req.user.userId, task.project);
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Only project admins can delete tasks.' });
    }
    await Task.findByIdAndDelete(req.params.id);
    const deleter = await User.findById(req.user.userId);
    // Send notification to all relevant users
    await sendRoleBasedNotifications({
      type: 'task_deleted',
      message: `${deleter ? deleter.name : 'Someone'} deleted the task: ${task.title}`,
      entityId: task._id,
      entityType: 'Task',
      projectId: task.project._id || task.project,
      byUser: req.user.userId,
      extra: {
        action: 'deleted',
        taskId: task._id,
        title: task.title,
        by: req.user.userId,
        byName: deleter ? deleter.name : 'User',
        time: new Date(),
        project: task.project._id || task.project
      }
    });
    // Emit real-time event to the project team for task deletion
    const project = await Project.findById(task.project._id || task.project);
    if (project && project.team) {
      console.log('[SOCKET] Emitting task:deleted', { team: project.team.toString(), taskId: task._id });
      io.to(project.team.toString()).emit('task:deleted', { taskId: task._id });
    }
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