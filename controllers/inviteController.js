const Invite = require('../models/Invite');
const Team = require('../models/Team');
const User = require('../models/User');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Set up transporter (for Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Create and send a team invite
async function createInvite(req, res) {
  console.log('createInvite called', req.body);
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    // Get the user's team
    const user = await User.findById(req.user.userId);
    if (!user || !user.team) {
      return res.status(400).json({ error: 'You must be part of a team to send invites.' });
    }

    // Check if user is already in the team
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.team && existingUser.team.toString() === user.team.toString()) {
      return res.status(400).json({ error: 'User is already a member of your team.' });
    }

    // Generate a unique token
    const token = crypto.randomBytes(24).toString('hex');
    
    // Save invite
    const invite = new Invite({
      email,
      team: user.team,
      inviter: req.user.userId,
      token
    });
    await invite.save();

    // Create invite link
    const inviteLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/index.html?inviteToken=${token}`;
    
    // Send email
    await transporter.sendMail({
      from: 'JMG Project Manager <' + process.env.EMAIL_USER + '>',
      to: email,
      subject: 'You are invited to join a team!',
      html: `
        <p>You have been invited to join a team. Click <a href="${inviteLink}">here</a> to sign up!</p>
        <p>Once you join, you'll have access to all team projects and can collaborate with team members.</p>
      `
    });

    console.log('Invite email sent to:', email);
    res.status(201).json({ message: 'Invite sent!', inviteLink });
  } catch (err) {
    console.error('Error sending invite email:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { createInvite }; 