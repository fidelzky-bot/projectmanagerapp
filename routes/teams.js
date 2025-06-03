const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const User = require('../models/User');
const auth = require('../middleware/auth');

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

// Get current user's team
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('team');
    if (!user || !user.team) {
      return res.status(404).json({ error: 'No team found' });
    }
    res.json(user.team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get team members
router.get('/:teamId/members', auth, async (req, res) => {
  try {
    console.log('Fetching team members for teamId:', req.params.teamId);
    const team = await Team.findById(req.params.teamId)
      .populate('members', 'name email role');
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

module.exports = router; 