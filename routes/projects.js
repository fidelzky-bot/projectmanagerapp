const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const clerkAuth = require('../middleware/auth');
const syncUser = require('../middleware/syncUser');

// Create a new project (protected)
router.post('/', clerkAuth, syncUser, projectController.createProject);
// Get all projects (public for testing)
router.get('/', projectController.getProjects);
// Get a single project by ID
router.get('/:id', projectController.getProjectById);
// Update a project
router.put('/:id', projectController.updateProject);
// Delete a project
router.delete('/:id', projectController.deleteProject);

router.get('/', (req, res) => {
  res.json([{ name: "Test Project" }]);
});

module.exports = router;