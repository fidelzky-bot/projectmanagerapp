const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String },
  message: { type: String },
  entityId: { type: String }, // e.g., task or project ID
  entityType: { type: String }, // 'Task', 'Project', etc.
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  taskTitle: { type: String },
  title: { type: String },
  projectName: { type: String },
  newRole: { type: String }
});

module.exports = mongoose.model('Notification', NotificationSchema);