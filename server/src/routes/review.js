const express = require('express');
const ReviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All review routes require authentication
router.use(authMiddleware);

// Review management routes
router.post('/', ReviewController.submitReview);
router.get('/pending', ReviewController.getPendingReviews);

module.exports = router;