const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const User = require('../models/User');
const auth = require('../middleware/auth');
const Project = require('../models/Project');
const ProjectUserRole = require('../models/ProjectUserRole');

// Create a new team
router.post('/', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.user.userId;

    // Create team
    const team = new Team({
      name,
      description,
      owner: userId,
      members: [userId]
    });
    await team.save();

    // Add team to user
    await User.findByIdAndUpdate(userId, { 
      team: team._id,
      role: 'admin'
    });

    res.status(201).json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get the current user's team
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.team) {
      return res.status(404).json({ error: 'User is not part of a team.' });
    }
    const team = await Team.findById(user.team);
    if (!team) {
      return res.status(404).json({ error: 'Team not found.' });
    }
    res.json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get team members
router.get('/:teamId/members', auth, async (req, res) => {
  try {
    console.log('Fetching team members for teamId:', req.params.teamId);
    const team = await Team.findById(req.params.teamId)
      .populate('members', 'name nickname email avatar bio occupation birthday hobby jobTitle contact lastActive');
    if (!team) {
      console.log('Team not found for teamId:', req.params.teamId);
      return res.status(404).json({ error: 'Team not found' });
    }
    res.json(team.members);
  } catch (err) {
    console.error('Error fetching team members:', err);
    res.status(500).json({ error: err.message });
  }
});

// Remove a member from the team
router.delete('/:teamId/members/:userId', auth, async (req, res) => {
  try {
    const { teamId, userId } = req.params;
    const requesterId = req.user.userId;

    // Get the team
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check if requester is the team owner
    if (team.owner.toString() !== requesterId) {
      return res.status(403).json({ error: 'Only team owner can remove members' });
    }

    // Don't allow removing the team owner
    if (userId === team.owner.toString()) {
      return res.status(400).json({ error: 'Cannot remove team owner' });
    }

    // Remove user from team
    await Team.findByIdAndUpdate(teamId, {
      $pull: { members: userId }
    });

    // Update user's team and role
    await User.findByIdAndUpdate(userId, {
      $unset: { team: 1, role: 1 }
    });

    // Remove user from all team projects
    const projects = await Project.find({ team: teamId });
    for (const project of projects) {
      // Remove from project members
      await Project.findByIdAndUpdate(project._id, {
        $pull: { members: userId }
      });
      // Remove project roles
      await ProjectUserRole.findOneAndDelete({
        projectId: project._id,
        userId: userId
      });
    }

    // Emit real-time event
    const { io } = require('../server');
    io.to(teamId).emit('team:memberRemoved', { userId });

    res.json({ message: 'Member removed successfully' });
  } catch (err) {
    console.error('Error removing team member:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 