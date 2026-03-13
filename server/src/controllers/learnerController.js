const db = require('../config/database');

class LearnerController {
  // Get learner sessions
  static async getSessions(req, res) {
    try {
      const learnerSessions = db.requests.filter(r => 
        r.learner === req.user.id
      ).map(session => {
        const tutor = db.users.find(u => u.id === session.tutor);
        
        // Always return tutor as object with id, even if tutor user not found
        // This ensures video calls can work using the tutor ID from the request
        return {
          ...session,
          tutor: tutor ? { 
            id: tutor.id,
            name: tutor.name, 
            email: tutor.email 
          } : {
            id: session.tutor, // Use the tutor ID from request
            name: 'Tutor',
            email: 'unknown@example.com'
          }
        };
      });
      
      res.json(learnerSessions);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

module.exports = LearnerController;