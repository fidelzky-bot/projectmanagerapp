const ProjectUserRole = require('../models/ProjectUserRole');
const User = require('../models/User');

// Assign or update a user's role in a project
async function setUserRole(req, res) {
  try {
    const { userId, role } = req.body;
    const { projectId } = req.params;
    const updated = await ProjectUserRole.findOneAndUpdate(
      { userId, projectId },
      { role },
      { upsert: true, new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// Get all user roles for a project
async function getProjectRoles(req, res) {
  try {
    const { projectId } = req.params;
    const roles = await ProjectUserRole.find({ projectId }).populate('userId', 'name email');
    res.json(roles);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// Remove a user's role from a project
async function removeUserRole(req, res) {
  try {
    const { userId } = req.body;
    const { projectId } = req.params;
    await ProjectUserRole.findOneAndDelete({ userId, projectId });
    res.json({ message: 'Role removed' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = { setUserRole, getProjectRoles, removeUserRole }; 