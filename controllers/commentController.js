const Comment = require('../models/Comment');
const { io } = require('../server');

// Create a new comment
async function createComment(req, res) {
  try {
    const { text, task } = req.body;
    if (!task) return res.status(400).json({ error: 'Task is required' });
    const author = req.mongoUser._id;
    const comment = new Comment({ text, author, task });
    await comment.save();
    await comment.populate('author');
    io.emit('comment:new', comment);
    res.status(201).json(comment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// Get all comments for a task
async function getComments(req, res) {
  try {
    const { taskId } = req.query;
    if (!taskId) return res.status(400).json({ error: 'taskId is required' });
    const comments = await Comment.find({ task: taskId }).populate('author');
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Delete a comment
async function deleteComment(req, res) {
  try {
    const comment = await Comment.findByIdAndDelete(req.params.id);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createComment,
  getComments,
  deleteComment
};