const Invite = require('../models/Invite');
const Team = require('../models/Team');
const User = require('../models/User');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Notification = require('../models/Notification');
const Project = require('../models/Project');
const ProjectUserRole = require('../models/ProjectUserRole');

// Set up transporter (for Gmail)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  debug: true
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
    const inviteLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/index.html?invite=${token}`;
    
    // Send email
    await transporter.sendMail({
      from: '"JMG Project Manager" <' + process.env.EMAIL_USER + '>',
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

// Join a team with an invite token (for existing users)
exports.joinTeamWithInviteToken = async function(req, res) {
  try {
    const { inviteToken } = req.body;
    const userId = req.user.userId;
    if (!inviteToken) return res.status(400).json({ error: 'Invite token required.' });
    const Invite = require('../models/Invite');
    const Team = require('../models/Team');
    const User = require('../models/User');
    const Project = require('../models/Project');
    const ProjectUserRole = require('../models/ProjectUserRole');
    const invite = await Invite.findOne({ token: inviteToken, status: 'pending' });
    if (!invite) return res.status(400).json({ error: 'Invalid or expired invite token.' });
    // Check if user is already a member
    const team = await Team.findById(invite.team);
    if (!team) return res.status(404).json({ error: 'Team not found.' });
    if (team.members.includes(userId)) {
      return res.status(400).json({ error: 'You are already a member of this team.' });
    }
    // Add user to team
    await Team.findByIdAndUpdate(invite.team, { $addToSet: { members: userId } });
    await User.findByIdAndUpdate(userId, { team: invite.team, role: 'member' });
    // Add user to all projects of the team and assign default role
    const projects = await Project.find({ team: invite.team });
    for (const project of projects) {
      await Project.findByIdAndUpdate(project._id, { $addToSet: { members: userId } });
      await ProjectUserRole.findOneAndUpdate(
        { userId, projectId: project._id },
        { role: 'viewer' },
        { upsert: true, new: true }
      );
    }
    // Mark invite as accepted
    invite.status = 'accepted';
    await invite.save();
    // Emit real-time event
    const { io } = require('../server');
    io.to(invite.team.toString()).emit('team:memberAdded', { userId });
    res.json({ message: 'Joined team successfully.' });
  } catch (err) {
    console.error('Error joining team with invite token:', err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createInvite }; 