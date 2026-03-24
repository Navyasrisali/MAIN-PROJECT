const db = require('../config/database');
const NotificationService = require('../services/notificationService');
const path = require('path');
const fs = require('fs');

class AdminController {
  // Get all pending certificate verifications
  static async getPendingVerifications(req, res) {
    try {
      const pendingTutors = db.users.filter(
        user => user.role === 'tutor' && user.verificationStatus === 'pending'
      );
      
      res.json(pendingTutors.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        subjects: user.subjects,
        certificateUrl: user.certificateUrl,
        createdAt: user.createdAt
      })));
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Get all tutors (verified, pending, rejected)
  static async getAllTutors(req, res) {
    try {
      const tutors = db.users.filter(user => user.role === 'tutor');
      
      res.json(tutors.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        subjects: user.subjects,
        verificationStatus: user.verificationStatus,
        isVerified: user.isVerified,
        certificateUrl: user.certificateUrl,
        certificateRejectionReason: user.certificateRejectionReason,
        rating: user.rating,
        reviewCount: user.reviewCount,
        createdAt: user.createdAt
      })));
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Approve tutor certificate
  static async approveCertificate(req, res) {
    try {
      const tutorId = parseInt(req.params.tutorId);
      const tutor = db.users.find(u => u.id === tutorId && u.role === 'tutor');
      
      if (!tutor) {
        return res.status(404).json({ message: 'Tutor not found' });
      }

      tutor.isVerified = true;
      tutor.verificationStatus = 'approved';
      tutor.certificateRejectionReason = null;
      db.save();

      // Send notification to tutor
      await NotificationService.sendNotification(
        tutorId,
        `🎉 Congratulations! Your certificate has been verified. You can now start teaching ${tutor.subjects.join(', ')}.`,
        'verification'
      );

      res.json({ 
        message: 'Certificate approved successfully',
        tutor: {
          id: tutor.id,
          name: tutor.name,
          isVerified: tutor.isVerified
        }
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Reject tutor certificate
  static async rejectCertificate(req, res) {
    try {
      const tutorId = parseInt(req.params.tutorId);
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({ message: 'Rejection reason is required' });
      }

      const tutor = db.users.find(u => u.id === tutorId && u.role === 'tutor');
      
      if (!tutor) {
        return res.status(404).json({ message: 'Tutor not found' });
      }

      tutor.isVerified = false;
      tutor.verificationStatus = 'rejected';
      tutor.certificateRejectionReason = reason;
      db.save();

      // Send notification to tutor
      await NotificationService.sendNotification(
        tutorId,
        `❌ Your certificate verification was rejected. Reason: ${reason}. Please upload a valid certificate.`,
        'verification'
      );

      res.json({ 
        message: 'Certificate rejected',
        reason: reason
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Get platform statistics
  static async getStatistics(req, res) {
    try {
      const stats = {
        totalUsers: db.users.length,
        totalLearners: db.users.filter(u => u.role === 'learner').length,
        totalTutors: db.users.filter(u => u.role === 'tutor').length,
        verifiedTutors: db.users.filter(u => u.role === 'tutor' && u.isVerified).length,
        pendingVerifications: db.users.filter(u => u.role === 'tutor' && u.verificationStatus === 'pending').length,
        rejectedTutors: db.users.filter(u => u.role === 'tutor' && u.verificationStatus === 'rejected').length,
        totalSessions: db.requests.length,
        completedSessions: db.requests.filter(r => r.status === 'completed' || r.status === 'reviewed').length,
        totalReviews: db.reviews.length,
        averageRating: db.reviews.length > 0 
          ? (db.reviews.reduce((sum, r) => sum + r.rating, 0) / db.reviews.length).toFixed(2)
          : 0
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Get all users (for admin management)
  static async getAllUsers(req, res) {
    try {
      const users = db.users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isOnline: user.isOnline,
        isVerified: user.isVerified,
        verificationStatus: user.verificationStatus,
        createdAt: user.createdAt
      }));

      res.json(users);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

module.exports = AdminController;
