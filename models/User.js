const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  contact: String,
  lastActive: { type: Date, default: Date.now },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  role: { type: String, enum: ['admin', 'member'], default: 'member' },
  avatar: String,
  jobTitle: String,
  bio: String,
  birthday: Date,
  status: {
    text: String,
    emoji: String,
    expiresAt: Date
  }
});

module.exports = mongoose.model('User', UserSchema);