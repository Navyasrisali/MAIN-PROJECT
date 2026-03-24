const db = require('../config/database');
const NotificationService = require('../services/notificationService');
const socketManager = require('../config/socket');
const path = require('path');
const fs = require('fs');

const normalizeSubjectKey = (subject) => String(subject || '').trim().toLowerCase();

const getVerificationSummary = (user) => {
  const entries = Object.values(user.subjectVerifications || {});
  const approvedCount = entries.filter(e => e.status === 'approved').length;
  const pendingCount = entries.filter(e => e.status === 'pending').length;
  const rejectedCount = entries.filter(e => e.status === 'rejected').length;

  let verificationStatus = 'not_submitted';
  if (approvedCount > 0 && pendingCount === 0 && rejectedCount === 0) {
    verificationStatus = 'approved';
  } else if (pendingCount > 0) {
    verificationStatus = 'pending';
  } else if (rejectedCount > 0) {
    verificationStatus = 'rejected';
  }

  return {
    isVerified: approvedCount > 0,
    verificationStatus
  };
};

class AdminController {
  // Get all pending certificate verifications
  static async getPendingVerifications(req, res) {
    try {
      const pendingRows = [];

      db.users
        .filter(user => user.role === 'tutor')
        .forEach((user) => {
          const verificationMap = user.subjectVerifications || {};
          Object.entries(verificationMap).forEach(([subjectKey, verification]) => {
            if (verification.status === 'pending' && verification.certificateUrl) {
              pendingRows.push({
                tutorId: user.id,
                name: user.name,
                email: user.email,
                subject: verification.subject,
                subjectKey,
                certificateUrl: verification.certificateUrl,
                uploadedAt: verification.uploadedAt || user.createdAt,
                createdAt: user.createdAt
              });
            }
          });
        });

      res.json(pendingRows);
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
        subjectVerifications: user.subjectVerifications || {},
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
      const tutorId = parseInt(req.params.tutorId || req.body.tutorId);
      const { subject } = req.body;
      if (Number.isNaN(tutorId)) {
        return res.status(400).json({ message: 'Invalid tutor id' });
      }
      const tutor = db.users.find(u => u.id === tutorId && u.role === 'tutor');
      
      if (!tutor) {
        return res.status(404).json({ message: 'Tutor not found' });
      }

      if (!subject || !String(subject).trim()) {
        return res.status(400).json({ message: 'Subject is required' });
      }

      const subjectKey = normalizeSubjectKey(subject);
      const verification = tutor.subjectVerifications && tutor.subjectVerifications[subjectKey];
      if (!verification) {
        return res.status(404).json({ message: 'Subject certificate not found for tutor' });
      }

      verification.status = 'approved';
      verification.rejectionReason = null;
      verification.approvedAt = new Date().toISOString();

      const summary = getVerificationSummary(tutor);
      tutor.isVerified = summary.isVerified;
      tutor.verificationStatus = summary.verificationStatus;
      db.save();

      // Send notification to tutor
      await NotificationService.sendNotification(
        tutorId,
        `🎉 Your certificate for ${verification.subject} has been verified.`,
        'verification'
      );

      // Emit real-time socket event to update tutor immediately
      socketManager.emitToUser(tutorId, 'certificate:verified', {
        isVerified: true,
        verificationStatus: 'approved',
        subject: verification.subject,
        tutorId: tutor.id
      });

      res.json({ 
        message: 'Certificate approved successfully',
        tutor: {
          id: tutor.id,
          name: tutor.name,
          isVerified: tutor.isVerified,
          verificationStatus: tutor.verificationStatus,
          subjectVerifications: tutor.subjectVerifications || {}
        }
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Reject tutor certificate
  static async rejectCertificate(req, res) {
    try {
      const tutorId = parseInt(req.params.tutorId || req.body.tutorId);
      const { reason, subject } = req.body;
      if (Number.isNaN(tutorId)) {
        return res.status(400).json({ message: 'Invalid tutor id' });
      }
      
      if (!reason) {
        return res.status(400).json({ message: 'Rejection reason is required' });
      }

      const tutor = db.users.find(u => u.id === tutorId && u.role === 'tutor');
      
      if (!tutor) {
        return res.status(404).json({ message: 'Tutor not found' });
      }

      if (!subject || !String(subject).trim()) {
        return res.status(400).json({ message: 'Subject is required' });
      }

      const subjectKey = normalizeSubjectKey(subject);
      const verification = tutor.subjectVerifications && tutor.subjectVerifications[subjectKey];
      if (!verification) {
        return res.status(404).json({ message: 'Subject certificate not found for tutor' });
      }

      verification.status = 'rejected';
      verification.rejectionReason = reason;
      verification.rejectedAt = new Date().toISOString();

      const summary = getVerificationSummary(tutor);
      tutor.isVerified = summary.isVerified;
      tutor.verificationStatus = summary.verificationStatus;
      db.save();

      // Send notification to tutor
      await NotificationService.sendNotification(
        tutorId,
        `❌ Your certificate for ${verification.subject} was rejected. Reason: ${reason}. Please upload a valid certificate.`,
        'verification'
      );

      // Emit real-time socket event to update tutor immediately
      socketManager.emitToUser(tutorId, 'certificate:rejected', {
        isVerified: false,
        verificationStatus: 'rejected',
        subject: verification.subject,
        rejectionReason: reason,
        tutorId: tutor.id
      });

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
