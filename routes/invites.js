const express = require('express');
const router = express.Router();
const { createInvite, joinTeamWithInviteToken } = require('../controllers/inviteController');
const auth = require('../middleware/auth');
const crypto = require('crypto');
const Invite = require('../models/Invite');
const User = require('../models/User');
const { io } = require('../server');

// POST /api/invites - create and send an invite
router.post('/', auth, createInvite);

// POST /api/invites/generate-link - generate a reusable invite link
router.post('/generate-link', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.team) {
      return res.status(400).json({ error: 'You must be part of a team to generate invite links.' });
    }

    // Generate a unique token
    const token = crypto.randomBytes(24).toString('hex');
    
    // Save invite
    const invite = new Invite({
      team: user.team,
      inviter: req.user.userId,
      token,
      status: 'pending'
    });
    await invite.save();

    // Create invite link
    const inviteLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/index.html?invite=${token}`;

    // Emit real-time event to all team members
    io.to(user.team.toString()).emit('team:inviteLinkGenerated', { inviteLink });
    
    res.json({ inviteLink });
  } catch (err) {
    console.error('Error generating invite link:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/invites/join - existing user joins a team with invite token
router.post('/join', auth, joinTeamWithInviteToken);

module.exports = router; 