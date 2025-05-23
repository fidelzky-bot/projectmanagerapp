const Invite = require('../models/Invite');
const Project = require('../models/Project');
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

// Create and send an invite
async function createInvite(req, res) {
  console.log('createInvite called', req.body);
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
    const inviteLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/index.html?inviteToken=${token}`;
    console.log('Invite link:', inviteLink);
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'You are invited to join a project!',
      html: `<p>You have been invited to join a project. Click <a href="${inviteLink}">here</a> to sign up!</p>`
    });
    console.log('Invite email sent to:', email);
    res.status(201).json({ message: 'Invite sent!', inviteLink });
  } catch (err) {
    console.error('Error sending invite email:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { createInvite }; 