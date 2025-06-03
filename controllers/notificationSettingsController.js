const NotificationSettings = require('../models/NotificationSettings');

// Get notification settings for a project
async function getSettings(req, res) {
  try {
    const { projectId } = req.params;
    let settings = await NotificationSettings.findOne({ projectId });
    if (!settings) {
      // If not found, create default settings
      settings = await NotificationSettings.create({ projectId });
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Update notification settings for a project
async function updateSettings(req, res) {
  try {
    const { projectId } = req.params;
    const updates = req.body;
    let settings = await NotificationSettings.findOneAndUpdate(
      { projectId },
      updates,
      { new: true, upsert: true }
    );
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getSettings,
  updateSettings
}; 