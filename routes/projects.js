const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const clerkAuth = require('../middleware/auth');
const syncUser = require('../middleware/syncUser');
const auth = require('../middleware/auth');
const Project = require('../models/Project');
const User = require('../models/User');
const { io } = require('../server');
const projectUserRoleController = require('../controllers/projectUserRoleController');

// Create a new project (protected)
router.post('/', auth, async (req, res) => {
  const { name, description } = req.body;
  const user = await User.findById(req.user.userId);
  if (!user || !user.team) {
    return res.status(400).json({ error: 'You must be part of a team to create a project.' });
  }
  const project = new Project({
    name,
    description,
    team: user.team,
    createdBy: user._id,
    status: 'active'
  });
  await project.save();
  // Emit notification for project creation
  io.emit('notification', {
    type: 'created_project',
    projectId: project._id,
    title: project.name,
    by: user._id,
    byName: user.name,
    time: new Date()
  });
  res.status(201).json(project);
});

// Get all projects for the current user's team (protected)
router.get('/', auth, async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user || !user.team) {
    return res.json([]);
  }
  const projects = await Project.find({ team: user.team });
  res.json(projects);
});

// Get a single project by ID
router.get('/test', (req, res) => {
  res.json({ message: "Projects test route works!" });
});
router.get('/:id', projectController.getProjectById);
// Update a project
router.put('/:id', projectController.updateProject);
// Delete a project
router.delete('/:id', projectController.deleteProject);

// Add a member to a project
router.post('/:projectId/addMember', async (req, res) => {
  const { userId } = req.body; // The user to add (should be their ObjectId)
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.projectId,
      { $addToSet: { members: userId } }, // $addToSet avoids duplicates
      { new: true }
    ).populate('members', 'name email');
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project.members);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// Project user roles
router.get('/:projectId/roles', auth, projectUserRoleController.getProjectRoles);
router.post('/:projectId/roles', auth, projectUserRoleController.setUserRole);
router.delete('/:projectId/roles', auth, projectUserRoleController.removeUserRole);

module.exports = router;