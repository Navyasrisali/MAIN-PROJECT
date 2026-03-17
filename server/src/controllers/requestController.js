const db = require('../config/database');
const { TutorRequest } = require('../models');
const NotificationService = require('../services/notificationService');
const socketManager = require('../config/socket');

class RequestController {
  static buildJitsiMeetingLink(request, tutor, learner) {
    const safeSubject = (request.subject || 'session').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const roomName = `peer-${request.id}-${tutor.id}-${learner.id}-${safeSubject}`;
    return `https://meet.jit.si/${roomName}`;
  }

  // Send request to tutor
  static async createRequest(req, res) {
    try {
      const { tutorId, subject } = req.body;
      
      // Check if learner has pending reviews
      const pendingReviews = db.requests.filter(r => 
        r.learner === req.user.id && r.status === 'completed'
      );
      
      const reviewedSessions = db.reviews.filter(r => r.learner === req.user.id);
      
      if (pendingReviews.length > reviewedSessions.length) {
        return res.status(400).json({ 
          message: 'You must review your previous session before requesting a new tutor' 
        });
      }
      
      const requestData = {
        id: db.getNextId(),
        learner: req.user.id,
        tutor: parseInt(tutorId),
        subject,
        status: 'pending',
        createdAt: new Date()
      };
      
      const request = new TutorRequest(requestData);
      db.requests.push(request);
      db.save(); // Save new request immediately
      
      // Send notification to tutor
      await NotificationService.sendNotification(
        parseInt(tutorId),
        `New tutoring request for ${subject}`,
        'request'
      );
      
      res.status(201).json(request);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Accept/Reject request
  static async respondToRequest(req, res) {
    try {
      const { status } = req.body; // 'accepted' or 'rejected'
      
      const request = db.requests.find(r => r.id === parseInt(req.params.id));
      
      if (!request) {
        return res.status(404).json({ message: 'Request not found' });
      }
      
      request.status = status;
      db.save(); // Save status change
      
      if (status === 'accepted') {
        // Set session date and generate Jitsi link
        request.sessionDate = new Date();
        const tutor = db.users.find(u => u.id === request.tutor);
        const learner = db.users.find(u => u.id === request.learner);

        if (!tutor || !learner) {
          return res.status(404).json({ message: 'Tutor or learner not found' });
        }

        request.meetingLink = request.meetingLink || this.buildJitsiMeetingLink(request, tutor, learner);
        db.save();

        console.log(`🎉 Request accepted! Jitsi meeting link created`);
        console.log(`📡 Emitting session:accepted to learner ${request.learner}`);

        // Notify learner via socket with meeting details
        socketManager.emitToUser(request.learner, 'session:accepted', {
          requestId: request.id,
          tutorId: tutor.id,
          tutorName: tutor.name,
          meetingLink: request.meetingLink
        });

        console.log(`✅ Socket event emitted with data:`, {
          requestId: request.id,
          tutorId: tutor.id,
          tutorName: tutor.name,
          meetingLink: request.meetingLink
        });

        // Notify learner that request was accepted (non-blocking)
        NotificationService.sendNotification(
          request.learner,
          `Your request has been accepted. Join here: ${request.meetingLink}`,
          'acceptance'
        ).catch(err => console.error('Notification error:', err));
      } else {
        // Notify learner of rejection (non-blocking)
        NotificationService.sendNotification(
          request.learner,
          `Your request for ${request.subject} has been rejected`,
          'rejection'
        ).catch(err => console.error('Notification error:', err));
      }
      
      res.json(request);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Complete session (tutor marks as completed)
  static async completeSession(req, res) {
    try {
      const request = db.requests.find(r => r.id === parseInt(req.params.id));
      if (!request) {
        return res.status(404).json({ message: 'Session not found' });
      }
      
      request.status = 'completed';
      request.completedAt = new Date();
      db.save(); // Save completion status
      
      const learner = db.users.find(u => u.id === request.learner);
      const tutor = db.users.find(u => u.id === request.tutor);
      
      // Send notification to learner for mandatory review
      await NotificationService.sendNotification(
        request.learner,
        `⭐ Please review your session with ${tutor.name}. You must complete this review before booking new sessions.`,
        'review'
      );
      
      console.log(`📝 Session completed! Learner ${learner.name} must review tutor ${tutor.name}`);
      
      res.json(request);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Debug endpoint - Get all requests/sessions (remove in production)
  static async debugSessions(req, res) {
    try {
      const allSessions = db.requests.map(request => {
        const tutor = db.users.find(u => u.id === request.tutor);
        const learner = db.users.find(u => u.id === request.learner);
        return {
          id: request.id,
          status: request.status,
          subject: request.subject,
          tutor: tutor ? tutor.name : 'Unknown',
          learner: learner ? learner.name : 'Unknown',
          createdAt: request.createdAt
        };
      });
      
      res.json({
        totalSessions: allSessions.length,
        sessions: allSessions,
        totalUsers: db.users.length,
        totalReviews: db.reviews.length
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

module.exports = RequestController;