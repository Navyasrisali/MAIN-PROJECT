const db = require('../config/database');
const { Review } = require('../models');
const { calculateAverageRating } = require('../utils/helpers');
const NotificationService = require('../services/notificationService');
const socketManager = require('../config/socket');

class ReviewController {
  // Submit review
  static async submitReview(req, res) {
    try {
      const { requestId, rating, comment } = req.body;
      
      const request = db.requests.find(r => r.id === parseInt(requestId));
      if (!request) {
        return res.status(404).json({ message: 'Request not found' });
      }
      
      const reviewData = {
        id: db.getNextId(),
        request: parseInt(requestId),
        learner: req.user.id,
        tutor: request.tutor,
        rating,
        comment,
        createdAt: new Date()
      };
      
      const review = new Review(reviewData);
      db.reviews.push(review);
      db.save(); // Save review immediately
      
      // Update tutor's rating and review count
      const tutorReviews = db.reviews.filter(r => r.tutor === request.tutor);
      const avgRating = calculateAverageRating(tutorReviews);
      
      const tutor = db.users.find(u => u.id === request.tutor);
      const learner = db.users.find(u => u.id === req.user.id);
      
      const oldRating = tutor.rating;
      const oldReviewCount = tutor.reviewCount;
      
      tutor.rating = avgRating;
      tutor.reviewCount = tutorReviews.length;
      
      // Mark the session as reviewed
      request.status = 'reviewed';
      request.reviewedAt = new Date();
      
      console.log(`⭐ Review submitted! ${learner.name} gave ${tutor.name} ${rating} stars. New average: ${tutor.rating}`);
      
      // 🚀 REAL-TIME UPDATE: Broadcast rating update to tutor
      const ratingUpdate = {
        tutorId: tutor.id,
        newRating: tutor.rating,
        newReviewCount: tutor.reviewCount,
        latestReview: {
          rating,
          comment,
          learnerName: learner.name,
          submittedAt: new Date()
        }
      };
      
      // Emit to all clients for real-time updates
      socketManager.emitToAll('ratingUpdated', ratingUpdate);
      console.log(`📡 Broadcasting rating update for tutor ${tutor.name} (ID: ${tutor.id}): ${oldRating} → ${tutor.rating} (${oldReviewCount} → ${tutor.reviewCount} reviews)`);
      
      // Send notification to tutor about the review
      await NotificationService.sendNotification(
        request.tutor,
        `You received a ${rating}-star review from ${learner.name}! ${comment ? 'Comment: ' + comment : ''}`,
        'review'
      );
      
      res.status(201).json({ 
        ...review,
        message: 'Review submitted successfully! You can now search for new tutors.',
        tutorNewRating: tutor.rating
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Get user's completed sessions that need review
  static async getPendingReviews(req, res) {
    try {
      const completedSessions = db.requests.filter(r => 
        r.learner === req.user.id && r.status === 'completed'
      ).map(session => {
        const tutor = db.users.find(u => u.id === session.tutor);
        return {
          ...session,
          tutor: { name: tutor.name }
        };
      });
      
      const reviewedSessionIds = db.reviews.filter(r => 
        r.learner === req.user.id
      ).map(r => r.request);
      
      const pendingReviews = completedSessions.filter(
        session => !reviewedSessionIds.includes(session.id)
      );
      
      res.json(pendingReviews);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

module.exports = ReviewController;