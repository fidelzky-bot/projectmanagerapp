const Message = require('../models/Message');
const { io } = require('../server');

// Send a new message
async function sendMessage(req, res) {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.mongoUser._id;

    const message = new Message({
      sender: senderId,
      receiver: receiverId,
      content
    });

    await message.save();
    await message.populate('sender', 'name');
    await message.populate('receiver', 'name');

    // Emit the message to the receiver in real-time
    io.emit(`message:${receiverId}`, message);
    
    res.status(201).json(message);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// Get conversation between two users
async function getConversation(req, res) {
  try {
    const { userId } = req.params;
    const currentUserId = req.mongoUser._id;

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId }
      ]
    })
    .sort({ createdAt: 1 })
    .populate('sender', 'name')
    .populate('receiver', 'name');

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Mark messages as read
async function markAsRead(req, res) {
  try {
    const { senderId } = req.params;
    const receiverId = req.mongoUser._id;

    await Message.updateMany(
      { sender: senderId, receiver: receiverId, read: false },
      { read: true }
    );

    res.json({ message: 'Messages marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get unread message count
async function getUnreadCount(req, res) {
  try {
    const receiverId = req.mongoUser._id;
    const count = await Message.countDocuments({
      receiver: receiverId,
      read: false
    });

    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  sendMessage,
  getConversation,
  markAsRead,
  getUnreadCount
}; 