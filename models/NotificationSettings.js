const mongoose = require('mongoose');

const NotificationSettingsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  statusUpdates: { type: Boolean, default: false },
  messages: { type: Boolean, default: false },
  tasksAdded: { type: Boolean, default: false },
  comments: { type: Boolean, default: false }
});

module.exports = mongoose.model('NotificationSettings', NotificationSettingsSchema); 