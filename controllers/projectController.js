const Project = require('../models/Project');
const User = require('./models/User');

// Create a new project
async function createProject(req, res) {
  try {
    const { name, description, members = [], owner } = req.body;
    // Just use the data from the request body
    const project = new Project({ name, description, members, owner });
    await project.save();
    res.status(201).json(project);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// Get all projects
async function getProjects(req, res) {
  try {
    const projects = await Project.find().populate('owner members');
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get a single project by ID
async function getProjectById(req, res) {
  try {
    const project = await Project.findById(req.params.id).populate('owner members');
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Update a project
async function updateProject(req, res) {
  try {
    const { name, description, members } = req.body;
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { name, description, members },
      { new: true }
    );
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// Delete a project
async function deleteProject(req, res) {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject
};