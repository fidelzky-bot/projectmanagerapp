const User = require('../models/User');

async function syncUser(req, res, next) {
  try {
    console.log('[DEBUG] syncUser: req.user.sub:', req.user && req.user.sub, 'req.user.email:', req.user && req.user.email);
    let user;
    if (req.user && req.user.sub) {
      user = await User.findOne({ clerkId: req.user.sub });
      if (!user) {
        user = await User.create({
          clerkId: req.user.sub,
          email: req.user.email,
          name: req.user.name,
          avatar: req.user.picture
        });
      }
    } else if (req.user && req.user.email) {
      user = await User.findOne({ email: req.user.email });
      if (!user) {
        user = await User.create({
          email: req.user.email,
          name: req.user.name
        });
      }
    }
    req.mongoUser = user;
    console.log('[DEBUG] syncUser: req.mongoUser._id:', user && user._id, 'email:', user && user.email);
    next();
  } catch (err) {
    return res.status(500).json({ error: 'User sync failed', details: err.message });
  }
}

module.exports = syncUser;