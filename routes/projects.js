const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const clerkAuth = require('../middleware/auth');
const syncUser = require('../middleware/syncUser');
const auth = require('../middleware/auth');
const Project = require('../models/Project');
const User = require('../models/User');

// Create a new project (protected)
router.post('/', auth, async (req, res) => {
  const { name, description } = req.body;
  const userId = req.user.userId;
  const project = new Project({
    name,
    description,
    owner: userId,
    members: [userId]
  });
  await project.save();
  res.status(201).json(project);
});

// Get all projects for the current user (protected)
router.get('/', auth, async (req, res) => {
  const userId = req.user.userId;
  const projects = await Project.find({
    $or: [
      { owner: userId },
      { members: userId }
    ]
  });
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

module.exports = router;