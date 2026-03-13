const express = require('express');
const TutorController = require('../controllers/tutorController');
const UserController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Public tutor routes (accessible without specific auth but need token)
router.get('/search/:subject', authMiddleware, TutorController.searchBySubject);
router.get('/:id/reviews', TutorController.getTutorReviews);

// Protected tutor routes (require authentication)
router.post('/subjects', authMiddleware, TutorController.addSubject);
router.get('/requests', authMiddleware, TutorController.getRequests);
router.get('/sessions', authMiddleware, TutorController.getSessions);
router.put('/online', authMiddleware, UserController.toggleOnlineStatus);

module.exports = router;