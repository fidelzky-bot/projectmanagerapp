// User controller

function getMe(req, res) {
  res.json({ user: req.mongoUser });
}

module.exports = { getMe };