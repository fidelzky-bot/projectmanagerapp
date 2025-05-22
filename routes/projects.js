const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const clerkAuth = require('../middleware/auth');
const syncUser = require('../middleware/syncUser');
const auth = require('../middleware/auth');
const Project = require('../models/Project');

// Create a new project (protected)
router.post('/', auth, async (req, res) => {
  const { name, description } = req.body;
  const project = await Project.create({
    name,
    description,
    owner: req.user.userId
  });
  res.status(201).json(project);
});

// Get all projects for the current user (protected)
router.get('/', auth, async (req, res) => {
  const projects = await Project.find({ owner: req.user.userId });
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

module.exports = router;