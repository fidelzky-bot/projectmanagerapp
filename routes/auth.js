const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Invite = require('../models/Invite');
const Project = require('../models/Project');
const Team = require('../models/Team');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Register route
router.post('/register', async (req, res) => {
  const { name, email, password, inviteToken } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password required' });
  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });

    // Handle invite token if present
    if (inviteToken) {
      const invite = await Invite.findOne({ token: inviteToken, status: 'pending' });
      if (!invite) {
        return res.status(400).json({ error: 'Invalid or expired invite token.' });
      }
      // Add user to team
      await Team.findByIdAndUpdate(invite.team, { $addToSet: { members: user._id } });
      // Update user with team info
      await User.findByIdAndUpdate(user._id, { 
        team: invite.team,
        role: 'member'
      });
      // Mark invite as accepted
      invite.status = 'accepted';
      await invite.save();

      // Add user to all projects of the team and assign default role
      const projects = await Project.find({ team: invite.team });
      const ProjectUserRole = require('../models/ProjectUserRole');
      for (const project of projects) {
        await Project.findByIdAndUpdate(project._id, { $addToSet: { members: user._id } });
        await ProjectUserRole.findOneAndUpdate(
          { userId: user._id, projectId: project._id },
          { role: 'viewer' },
          { upsert: true, new: true }
        );
      }
      // Emit real-time event to the team (require io here to avoid circular dependency)
      const { io } = require('../server');
      io.to(invite.team.toString()).emit('team:memberAdded', { userId: user._id, name: user.name });
      return res.status(201).json({ message: 'User created' });
    }

    // If no invite token, auto-create a team
    const team = await Team.create({
      name: `${name}'s Team`,
      owner: user._id,
      members: [user._id]
    });
    await User.findByIdAndUpdate(user._id, {
      team: team._id,
      role: 'admin'
    });

    res.status(201).json({ message: 'User created' });
  } catch (err) {
    res.status(400).json({ error: 'Email already exists' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '1d' });
  res.json({ token });
});

// Get current user (protected route)
router.get('/me', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    res.json(user);
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;