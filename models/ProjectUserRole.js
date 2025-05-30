const mongoose = require('mongoose');

const ProjectUserRoleSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { 
    type: String, 
    enum: ['admin', 'editor', 'commenter', 'viewer'], 
    default: 'viewer' 
  }
});

module.exports = mongoose.model('ProjectUserRole', ProjectUserRoleSchema); 