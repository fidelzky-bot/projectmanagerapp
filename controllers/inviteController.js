const Invite = require('../models/Invite');
const Project = require('../models/Project');
const User = require('../models/User');
const crypto = require('crypto');

// Create and send an invite
async function createInvite(req, res) {
  try {
    const { email, projectId } = req.body;
    if (!email || !projectId) {
      return res.status(400).json({ error: 'Email and projectId are required.' });
    }
    // Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }
    // Generate a unique token
    const token = crypto.randomBytes(24).toString('hex');
    // Save invite
    const invite = new Invite({
      email,
      project: projectId,
      inviter: req.user.userId, // assumes auth middleware sets req.user
      token
    });
    await invite.save();
    // Log the invite link (replace with email sending later)
    const inviteLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/signup?inviteToken=${token}`;
    console.log('Invite link:', inviteLink);
    res.status(201).json({ message: 'Invite sent!', inviteLink });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { createInvite }; 