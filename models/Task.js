const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: String,
  description: String,
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

module.exports = mongoose.model('Task', TaskSchema);