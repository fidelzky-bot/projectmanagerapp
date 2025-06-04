const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  text: String,
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

module.exports = mongoose.model('Comment', CommentSchema);