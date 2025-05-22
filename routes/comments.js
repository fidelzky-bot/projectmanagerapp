const express = require('express');
const router = express.Router();
const clerkAuth = require('../middleware/auth');
const syncUser = require('../middleware/syncUser');
const commentController = require('../controllers/commentController');

// Create a new comment (protected)
router.post('/', clerkAuth, syncUser, commentController.createComment);
// Get all comments for a task
router.get('/', commentController.getComments);
// Delete a comment (protected)
router.delete('/:id', clerkAuth, syncUser, commentController.deleteComment);

module.exports = router;