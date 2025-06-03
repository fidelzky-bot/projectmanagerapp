const mongoose = require('mongoose');

const NotificationSettingsSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    unique: true
  },
  roles: {
    admin: {
      taskUpdates: { type: Boolean, default: true },
      tasksAdded: { type: Boolean, default: true },
      comments: { type: Boolean, default: true },
      messages: { type: Boolean, default: true }
    },
    editor: {
      taskUpdates: { type: Boolean, default: true },
      tasksAdded: { type: Boolean, default: true },
      comments: { type: Boolean, default: true },
      messages: { type: Boolean, default: true }
    },
    commenter: {
      taskUpdates: { type: Boolean, default: false },
      tasksAdded: { type: Boolean, default: false },
      comments: { type: Boolean, default: true },
      messages: { type: Boolean, default: false }
    },
    viewer: {
      taskUpdates: { type: Boolean, default: false },
      tasksAdded: { type: Boolean, default: false },
      comments: { type: Boolean, default: false },
      messages: { type: Boolean, default: false }
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('NotificationSettings', NotificationSettingsSchema); 