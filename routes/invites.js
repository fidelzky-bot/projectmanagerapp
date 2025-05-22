const express = require('express');
const router = express.Router();
const { createInvite } = require('../controllers/inviteController');
const auth = require('../middleware/auth');

// POST /api/invites - create and send an invite
router.post('/', auth, createInvite);

module.exports = router; 