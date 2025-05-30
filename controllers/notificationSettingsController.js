const NotificationSettings = require('../models/NotificationSettings');

// Get notification settings for a user and project
async function getSettings(req, res) {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;
    let settings = await NotificationSettings.findOne({ userId, projectId });
    if (!settings) {
      settings = new NotificationSettings({ userId, projectId });
      await settings.save();
    }
    res.json(settings);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// Update notification settings for a user and project
async function updateSettings(req, res) {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;
    const update = req.body;
    const settings = await NotificationSettings.findOneAndUpdate(
      { userId, projectId },
      update,
      { upsert: true, new: true }
    );
    res.json(settings);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = { getSettings, updateSettings }; 