const Project = require('../models/Project');
const User = require('../models/User');
const ProjectUserRole = require('../models/ProjectUserRole');

console.log('projectController.js loaded');

// Create a new project
async function createProject(req, res) {
  console.log('createProject controller called');
  try {
    const { name, description, members = [], createdBy, team } = req.body;
    // Always use the authenticated user as creator if createdBy is not provided
    const creatorId = createdBy || req.user?.userId || req.mongoUser?._id;
    console.log('Creating project with creatorId:', creatorId);
    const project = new Project({ name, description, members, createdBy: creatorId, team });
    await project.save();
    // Assign creator as admin
    const adminRole = await ProjectUserRole.create({
      projectId: project._id,
      userId: creatorId,
      role: 'admin'
    });
    console.log('Admin role created:', adminRole);
    res.status(201).json(project);
  } catch (err) {
    console.error('Error in createProject:', err);
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
