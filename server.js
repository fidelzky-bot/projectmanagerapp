// Load environment variables
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const authRoutes = require('./routes/auth');
const Message = require('./models/Message');
const User = require('./models/User');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: [
    'https://jmgprojectmanagerapp.netlify.app',
    'http://localhost:3000'
  ],
  credentials: true
}));
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch((err) => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: [
      'https://jmgprojectmanagerapp.netlify.app',
      'http://localhost:3000'
    ],
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id, 'Origin:', socket.handshake.headers.origin);

  // Listen for user to join their own room for notifications
  socket.on('join', async (userId) => {
    if (userId) {
      socket.join(userId.toString());
      console.log('User joined room:', userId);
      // Also join all project rooms for real-time task updates
      try {
        const user = await User.findById(userId).populate('team');
        if (user && user.team) {
          // Join the team room for real-time team events
          socket.join(user.team._id.toString());
          console.log(`User ${userId} joined team room: ${user.team._id}`);
          // Find all projects for the user's team
          const Project = require('./models/Project');
          const projects = await Project.find({ team: user.team._id || user.team });
          projects.forEach(project => {
            socket.join(project._id.toString());
            console.log(`User ${userId} joined project room: ${project._id}`);
          });
        }
      } catch (err) {
        console.error('Error joining project rooms:', err);
      }
    }
  });

  // Listen for newMessage events from clients
  socket.on('newMessage', async (data) => {
    try {
      // Expect data: { receiverId, content, token }
      const { receiverId, content, token } = data;
      if (!token) return;
      // Verify JWT and get senderId
      let senderId;
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        senderId = decoded.userId || decoded._id || decoded.id;
      } catch (err) {
        console.error('Invalid token in socket newMessage:', err);
        return;
      }
      if (!senderId || !receiverId || !content) return;
      // Save the message to the database
      const message = new Message({ sender: senderId, receiver: receiverId, content });
      await message.save();
      await message.populate('sender', 'name email avatar');
      await message.populate('receiver', 'name email avatar');
      // Emit the message to both sender and receiver
      io.emit(`message:${receiverId}`, message);
      io.emit(`message:${senderId}`, message);
    } catch (err) {
      console.error('Socket newMessage error:', err);
    }
  });

  // Listen for avatar updates
  socket.on('user:updateAvatar', (data) => {
    if (data && data.userId && data.avatar) {
      io.emit('user:avatarUpdated', data);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Export io for use in controllers
module.exports.io = io;

// API routes
const projectsRouter = require('./routes/projects');
const tasksRouter = require('./routes/tasks');
const usersRouter = require('./routes/users');
const commentsRouter = require('./routes/comments');
const notificationsRouter = require('./routes/notifications');
const invitesRouter = require('./routes/invites');
const teamsRouter = require('./routes/teams');
const messagesRouter = require('./routes/messages');

console.log('Server file loaded and running latest code!');

app.use('/api/projects', (req, res, next) => {
  if (req.method === 'POST') {
    console.log('POST /api/projects called');
  }
  next();
}, projectsRouter);

app.use('/api/tasks', tasksRouter);
app.use('/api/users', usersRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/auth', authRoutes);
app.use('/api/invites', invitesRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/messages', messagesRouter);

// Health check route
app.get('/', (req, res) => {
  console.log('Root route hit');
  res.send('Project Manager App Backend is running.');
});

app.get('/test', (req, res) => {
  res.json({ message: "Test route works!" });
});

// 404 handler (should be last)
app.use((req, res) => {
  res.status(404).send('Not Found');
});

app.use('/uploads/avatars', express.static(path.join(__dirname, 'uploads/avatars')));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});