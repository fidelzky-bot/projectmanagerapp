const User = require('../models/User');

async function syncUser(req, res, next) {
  try {
    const clerkId = req.user.sub;
    let user = await User.findOne({ clerkId });
    if (!user) {
      // Create user from Clerk JWT
      user = await User.create({
        clerkId,
        email: req.user.email,
        name: req.user.name,
        avatar: req.user.picture
      });
    }
    req.mongoUser = user;
    next();
  } catch (err) {
    return res.status(500).json({ error: 'User sync failed', details: err.message });
  }
}

module.exports = syncUser;