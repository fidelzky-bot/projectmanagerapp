const NotificationSettings = require('../models/NotificationSettings');
const User = require('../models/User');
const Project = require('../models/Project');

// Get notification settings for a user and project
async function getSettings(req, res) {
  try {
    console.log('getSettings called', req.params, req.user);
    const { projectId } = req.params;
    const userId = req.user.userId;
    
    // Get project and populate team with members
    const project = await Project.findById(projectId).populate({ path: 'team', populate: { path: 'members' } });
    console.log('Fetched project:', project);
    if (!project) {
      console.log('Project not found for projectId:', projectId);
      return res.status(404).json({ error: 'Project not found' });
    }

    // Defensive: ensure project.team.members is always an array
    const teamArray = Array.isArray(project.team?.members) ? project.team.members : [];

    // Get or create notification settings
    let settings = await NotificationSettings.findOne({ userId, projectId });
    if (!settings) {
      settings = new NotificationSettings({ userId, projectId });
      await settings.save();
    }

    // Get team members with their notification preferences
    const teamMembers = await Promise.all(teamArray.map(async (member) => {
      const memberSettings = await NotificationSettings.findOne({ 
        userId: member._id, 
        projectId 
      });
      
      return {
        _id: member._id,
        name: member.name,
        email: member.email,
        receiveNotifications: memberSettings?.teamMemberPreferences?.find(
          pref => pref.memberId.toString() === userId.toString()
        )?.receiveNotifications ?? true
      };
    }));

    console.log('Returning notification settings:', { ...settings.toObject(), teamMembers });
    res.json({
      ...settings.toObject(),
      teamMembers
    });
  } catch (err) {
    console.log('Error in getSettings:', err);
    res.status(400).json({ error: err.message });
  }
}

// Update notification settings for a user and project
async function updateSettings(req, res) {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;
    const { statusUpdates, messages, tasksAdded, comments, teamMemberPreferences } = req.body;

    // Validate team member preferences
    if (teamMemberPreferences) {
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Verify all members are part of the project team
      const validMemberIds = project.team.map(member => member.toString());
      const invalidMembers = teamMemberPreferences.filter(
        pref => !validMemberIds.includes(pref.memberId.toString())
      );

      if (invalidMembers.length > 0) {
        return res.status(400).json({ error: 'Invalid team members in preferences' });
      }
    }

    const update = {
      statusUpdates,
      messages,
      tasksAdded,
      comments,
      teamMemberPreferences
    };

    const settings = await NotificationSettings.findOneAndUpdate(
      { userId, projectId },
      update,
      { upsert: true, new: true }
    );

    res.json(settings);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = { getSettings, updateSettings }; 