// Load environment variables
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const authRoutes = require('./routes/auth');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
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
    origin: process.env.CLIENT_URL,
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
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

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});