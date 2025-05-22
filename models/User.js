const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  // Add any other fields you want
});

module.exports = mongoose.model('User', UserSchema);