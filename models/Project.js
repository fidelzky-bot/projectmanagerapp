const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  name: String,
  description: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Project', ProjectSchema);