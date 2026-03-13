const db = require('../config/database');

class TutorController {
  // Add subjects to tutor profile
  static async addSubject(req, res) {
    try {
      const { subject } = req.body;
      const user = db.users.find(u => u.id === req.user.id);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      if (user.role !== 'tutor') {
        return res.status(403).json({ message: 'Only tutors can add subjects' });
      }
      
      // Initialize subjects array if it doesn't exist
      if (!user.subjects) {
        user.subjects = [];
      }
      
      // Add subject if not already present
      if (!user.subjects.includes(subject)) {
        user.subjects.push(subject);
      }
      
      res.json({ 
        message: 'Subject added successfully',
        subjects: user.subjects
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Search tutors by subject
  static async searchBySubject(req, res) {
    try {
      const { subject } = req.params;
      console.log(`🔍 Search request for subject: "${subject}" by user ${req.user.id}`);
      
      // Check if learner has pending reviews that must be completed
      const completedSessions = db.requests.filter(r => 
        r.learner === req.user.id && r.status === 'completed'
      );
      
      const reviewedSessionIds = db.reviews.filter(r => 
        r.learner === req.user.id
      ).map(r => r.request);
      
      const pendingReviews = completedSessions.filter(
        session => !reviewedSessionIds.includes(session.id)
      );
      
      // Block access if there are pending reviews
      if (pendingReviews.length > 0) {
        console.log(`❌ User ${req.user.id} blocked - has ${pendingReviews.length} pending reviews`);
        return res.status(403).json({ 
          message: 'Please complete reviews for your previous sessions before searching for new tutors',
          pendingReviews: pendingReviews.length,
          requiresReview: true
        });
      }
      
      // Debug: Log all tutors and their status
      const allTutors = db.users.filter(user => user.role === 'tutor');
      console.log(`📊 Total tutors in system: ${allTutors.length}`);
      allTutors.forEach(tutor => {
        console.log(`  - ${tutor.name}: online=${tutor.isOnline}, subjects=[${tutor.subjects?.join(', ') || 'none'}]`);
      });
      
      const tutors = db.users.filter(user => {
        const isRightRole = user.role === 'tutor';
        const isOnline = user.isOnline;
        const hasSubject = user.subjects && user.subjects.some(s => 
          s.toLowerCase().includes(subject.toLowerCase())
        );
        const isNotSelf = user.id !== req.user.id; // Don't show the searcher in results
        const isVerified = user.isVerified === true; // Only show verified tutors
        
        console.log(`  Checking ${user.name}: role=${user.role}, online=${isOnline}, hasSubject=${hasSubject}, isNotSelf=${isNotSelf}, verified=${isVerified}`);
        
        return isRightRole && isOnline && hasSubject && isNotSelf && isVerified;
      }).map(user => {
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          subjects: user.subjects,
          rating: user.rating || 0,
          reviewCount: user.reviewCount || 0,
          isOnline: user.isOnline
        };
      })
      // Sort tutors by highest rating first, then by review count
      .sort((a, b) => {
        if (b.rating !== a.rating) {
          return b.rating - a.rating; // Higher rating first
        }
        return b.reviewCount - a.reviewCount; // More reviews first if same rating
      });
      
      console.log(`✅ Found ${tutors.length} available tutors for "${subject}"`);
      res.json(tutors);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Get tutor reviews
  static async getTutorReviews(req, res) {
    try {
      const tutorReviews = db.reviews.filter(r => 
        r.tutor === parseInt(req.params.id)
      ).map(review => {
        const learner = db.users.find(u => u.id === review.learner);
        return {
          ...review,
          learner: { name: learner.name }
        };
      }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      res.json(tutorReviews);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Get tutor requests
  static async getRequests(req, res) {
    try {
      const tutorRequests = db.requests.filter(r => 
        r.tutor === req.user.id && r.status === 'pending'
      ).map(request => {
        const learner = db.users.find(u => u.id === request.learner);
        return {
          ...request,
          learner: { 
            id: learner.id,
            name: learner.name, 
            email: learner.email 
          }
        };
      });
      
      res.json(tutorRequests);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Get tutor sessions
  static async getSessions(req, res) {
    try {
      const tutorSessions = db.requests.filter(r => 
        r.tutor === req.user.id
      ).map(session => {
        const learner = db.users.find(u => u.id === session.learner);
        const sessionReview = db.reviews.find(r => r.request === session.id);
        
        // Always return learner as object with id, even if learner user not found
        // This ensures video calls can work using the learner ID from the request
        return {
          ...session,
          learner: learner ? { 
            id: learner.id,
            name: learner.name, 
            email: learner.email 
          } : {
            id: session.learner, // Use the learner ID from request
            name: 'Learner',
            email: 'unknown@example.com'
          },
          review: sessionReview || null
        };
      });
      
      res.json(tutorSessions);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

module.exports = TutorController;