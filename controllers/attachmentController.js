const Attachment = require('../models/Attachment');
const path = require('path');

// Upload a new attachment
async function uploadAttachment(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { task } = req.body;
    const uploader = req.mongoUser._id;
    const attachment = new Attachment({
      filename: req.file.filename,
      originalName: req.file.originalname,
      uploader,
      task
    });
    await attachment.save();
    res.status(201).json(attachment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// Get all attachments for a task
async function getAttachments(req, res) {
  try {
    const { taskId } = req.query;
    if (!taskId) return res.status(400).json({ error: 'taskId is required' });
    const attachments = await Attachment.find({ task: taskId });
    res.json(attachments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Download an attachment
async function downloadAttachment(req, res) {
  try {
    const attachment = await Attachment.findById(req.params.id);
    if (!attachment) return res.status(404).json({ error: 'Attachment not found' });
    const filePath = path.join(__dirname, '../uploads', attachment.filename);
    res.download(filePath, attachment.originalName);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  uploadAttachment,
  getAttachments,
  downloadAttachment
};