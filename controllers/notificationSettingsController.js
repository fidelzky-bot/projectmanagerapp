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
    console.log('project:', project);
    console.log('team.members:', project.team?.members);
    console.log('team.members[0]:', project.team?.members?.[0]);
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
    console.log('projectId:', projectId, 'userId:', userId);
    // Check if user is admin for this project
    const ProjectUserRole = require('../models/ProjectUserRole');
    const userRole = await ProjectUserRole.findOne({ projectId, userId });
    console.log('userRole:', userRole);
    if (!userRole || userRole.role !== 'admin') {
      console.log('User is not admin or role not found');
      return res.status(403).json({ error: 'Only project admins can update notification settings.' });
    }
    const { statusUpdates, messages, tasksAdded, comments } = req.body;
    // Validate that all user IDs are in the team
    const project = await Project.findById(projectId).populate({ path: 'team', populate: { path: 'members' } });
    console.log('project:', project);
    console.log('team.members:', project.team?.members);
    console.log('team.members[0]:', project.team?.members?.[0]);
    if (!project) {
      console.log('Project not found');
      return res.status(404).json({ error: 'Project not found' });
    }
    const validMemberIds = Array.isArray(project.team?.members)
      ? project.team.members.map(m => m._id.toString())
      : [];
    const allIds = [ ...(statusUpdates || []), ...(messages || []), ...(tasksAdded || []), ...(comments || []) ];
    console.log('validMemberIds:', validMemberIds);
    console.log('allIds:', allIds);
    allIds.forEach((id, idx) => {
      console.log(`allIds[${idx}]:`, id, typeof id, '| as string:', String(id));
    });
    validMemberIds.forEach((id, idx) => {
      console.log(`validMemberIds[${idx}]:`, id, typeof id);
    });
    // Minimal comparison tests
    console.log('Test includes:', validMemberIds.includes(allIds[0]));
    console.log('Test indexOf:', validMemberIds.indexOf(allIds[0]));
    console.log('Test ===:', validMemberIds[0] === allIds[0]);
    // Use Set for comparison
    const validSet = new Set(validMemberIds);
    if (allIds.some(id => !validSet.has(String(id)))) {
      console.log('Set failed ID:', allIds.find(id => !validSet.has(String(id))));
      return res.status(400).json({ error: 'Invalid user in notification settings.' });
    }
    const update = { statusUpdates, messages, tasksAdded, comments };
    const settings = await NotificationSettings.findOneAndUpdate(
      { projectId },
      update,
      { upsert: true, new: true }
    );
    console.log('Settings updated:', settings);
    res.json(settings);
  } catch (err) {
    console.log('Error in updateSettings:', err);
    res.status(400).json({ error: err.message });
  }
}

module.exports = { getSettings, updateSettings }; 