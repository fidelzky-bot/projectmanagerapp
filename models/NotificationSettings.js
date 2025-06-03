const mongoose = require('mongoose');

const NotificationSettingsSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    unique: true
  },
  // Arrays of user IDs who want to receive each type of notification
  statusUpdates: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  tasksAdded: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  messages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

module.exports = mongoose.model('NotificationSettings', NotificationSettingsSchema); 