// User controller

const io = require('../server').io; // Ensure this is correctly imported

function getMe(req, res) {
  res.json({ user: req.mongoUser });
}

// Update current user profile
router.put('/me', auth, async (req, res) => {
  const { name, phone, contact, avatar, jobTitle, bio, birthday, occupation, hobby, nickname } = req.body;
  const update = {
    name,
    contact: phone || contact, // Prefer phone if provided
    jobTitle,
    bio,
    birthday,
    occupation,
    hobby,
    nickname
  };
  if (avatar !== undefined) update.avatar = avatar;
  const user = await User.findByIdAndUpdate(
    req.user.userId,
    update,
    { new: true }
  ).select('-password');
  // Emit avatar update event
  if (avatar !== undefined && io) {
    io.emit('user:avatarUpdated', { userId: user._id, avatar: user.avatar });
  }
  res.json(user);
});

module.exports = { getMe };