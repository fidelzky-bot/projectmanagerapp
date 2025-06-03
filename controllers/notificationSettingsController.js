const NotificationSettings = require('../models/NotificationSettings');
const Project = require('../models/Project');

// Get notification settings for a project
async function getSettings(req, res) {
  try {
    const { projectId } = req.params;
    // Get project and populate team with members
    const project = await Project.findById(projectId).populate({ path: 'team', populate: { path: 'members' } });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const teamArray = Array.isArray(project.team?.members) ? project.team.members : [];
    let settings = await NotificationSettings.findOne({ projectId });
    if (!settings) {
      settings = new NotificationSettings({ projectId });
      await settings.save();
    }
    console.log('Project ID:', projectId);
    console.log('Team ID:', project.team?._id);
    console.log('Populated team members:', project.team?.members?.map(m => m._id));
    res.json({
      ...settings.toObject(),
      teamMembers: teamArray.map(m => ({ _id: m._id, name: m.name }))
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// Update notification settings for a project (admin only)
async function updateSettings(req, res) {
  console.log('updateSettings endpoint hit');
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;
    // Check if user is admin for this project
    const ProjectUserRole = require('../models/ProjectUserRole');
    const userRole = await ProjectUserRole.findOne({ projectId, userId });
    if (!userRole || userRole.role !== 'admin') {
      return res.status(403).json({ error: 'Only project admins can update notification settings.' });
    }
    const { statusUpdates, messages, tasksAdded, comments } = req.body;
    // Validate that all user IDs are in the team
    const project = await Project.findById(projectId).populate({ path: 'team', populate: { path: 'members' } });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const validMemberIds = Array.isArray(project.team?.members)
      ? project.team.members.map(m => m._id.toString ? m._id.toString() : String(m._id))
      : [];
    const allIds = [ ...(statusUpdates || []), ...(messages || []), ...(tasksAdded || []), ...(comments || []) ];

    // Fix: force both sides to primitive strings for comparison
    if (allIds.some(id => !validMemberIds.map(String).includes(String(id)))) {
      return res.status(400).json({ error: 'Invalid user in notification settings.' });
    }
    const update = { statusUpdates, messages, tasksAdded, comments };
    const settings = await NotificationSettings.findOneAndUpdate(
      { projectId },
      update,
      { upsert: true, new: true }
    );
    console.log('Project ID:', projectId);
    console.log('Team ID:', project.team?._id);
    console.log('Requesting user ID:', userId);
    console.log('Populated team members:', project.team?.members?.map(m => m._id));
    res.json(settings);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = { getSettings, updateSettings }; 