const express = require('express');
const LearnerController = require('../controllers/learnerController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All learner routes require authentication
router.use(authMiddleware);

// Learner management routes
router.get('/sessions', LearnerController.getSessions);

module.exports = router;