const mongoose = require('mongoose');

const AttachmentSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String },
  uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  uploadedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Attachment', AttachmentSchema);