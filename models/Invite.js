const mongoose = require('mongoose');

const InviteSchema = new mongoose.Schema({
  email: { type: String, required: true },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  inviter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending', 'accepted', 'expired'], default: 'pending' },
  createdAt: { type: Date, default: Date.now, expires: '7d' } // auto-delete after 7 days
});

module.exports = mongoose.model('Invite', InviteSchema); 