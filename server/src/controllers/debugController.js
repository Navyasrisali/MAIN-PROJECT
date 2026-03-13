const db = require('../config/database');
const bcrypt = require('bcryptjs');

class DebugController {
  // Debug endpoint to check current data
  static getData(req, res) {
    res.json({
      users: db.users.length,
      requests: db.requests.map(r => ({ 
        id: r.id, 
        status: r.status, 
        tutor: r.tutor, 
        learner: r.learner, 
        subject: r.subject 
      })),
      reviews: db.reviews.map(r => ({ 
        id: r.id, 
        request: r.request, 
        rating: r.rating, 
        comment: r.comment 
      }))
    });
  }

  // Debug endpoint to test password hashing and comparison
  static async testPassword(req, res) {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password required' });
      }

      const user = db.users.find(u => u.email === email);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      console.log(`🧪 Testing password for ${email}`);
      console.log(`🧪 Input password: "${password}"`);
      console.log(`🧪 Stored hash: ${user.password}`);
      
      const isMatch = await bcrypt.compare(password, user.password);
      console.log(`🧪 Comparison result: ${isMatch}`);

      // Also test creating a new hash with the same password
      const newHash = await bcrypt.hash(password, 10);
      console.log(`🧪 New hash for same password: ${newHash}`);
      
      const newHashMatch = await bcrypt.compare(password, newHash);
      console.log(`🧪 New hash comparison: ${newHashMatch}`);

      res.json({
        email,
        passwordMatch: isMatch,
        storedHash: user.password,
        newHash,
        newHashWorks: newHashMatch
      });

    } catch (error) {
      console.error('Error in password test:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = DebugController;