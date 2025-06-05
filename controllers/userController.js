// User controller

const io = require('../server').io; // Ensure this is correctly imported

function getMe(req, res) {
  res.json({ user: req.mongoUser });
}

// No route definitions here! Only export controller functions.

module.exports = { getMe };