const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  contact: String,
  lastActive: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);