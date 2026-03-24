const db = require('../config/database');

const normalizeSubjectKey = (subject) => String(subject || '').trim().toLowerCase();

const getVerificationSummary = (user) => {
  const map = user.subjectVerifications || {};
  const entries = Object.values(map);
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
    verificationStatus,
    approvedCount,
    pendingCount,
    rejectedCount
  };
};

const mapUserResponse = (user) => {
  const summary = getVerificationSummary(user);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    subjects: user.subjects || [],
    isOnline: user.isOnline,
    rating: user.rating || 0,
    reviewCount: user.reviewCount || 0,
    createdAt: user.createdAt,
    isVerified: summary.isVerified,
    verificationStatus: summary.verificationStatus,
    certificateUrl: user.certificateUrl || null,
    certificateRejectionReason: user.certificateRejectionReason || null,
    subjectVerifications: user.subjectVerifications || {}
  };
};

class UserController {
  // Get current authenticated user profile
  static async getCurrentUser(req, res) {
    try {
      const user = db.users.find(u => u.id === req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ user: mapUserResponse(user) });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Update user role and subjects
  static async updateRole(req, res) {
    try {
      const { role, subjects } = req.body;
      
      const user = db.users.find(u => u.id === req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      user.role = role;
      if (role === 'tutor' && subjects) {
        user.subjects = subjects;

        if (!user.subjectVerifications || typeof user.subjectVerifications !== 'object') {
          user.subjectVerifications = {};
        }

        const nextMap = {};
        user.subjects.forEach((subject) => {
          const subjectKey = normalizeSubjectKey(subject);
          if (!subjectKey) {
            return;
          }

          nextMap[subjectKey] = user.subjectVerifications[subjectKey] || {
            subject,
            status: 'not_submitted',
            certificateUrl: null,
            rejectionReason: null,
            uploadedAt: null
          };

          // Keep canonical subject label synced with latest user entry.
          nextMap[subjectKey].subject = subject;
        });

        user.subjectVerifications = nextMap;

        const summary = getVerificationSummary(user);
        user.isVerified = summary.isVerified;
        user.verificationStatus = summary.verificationStatus;
      }

      db.save();
      
      res.json({ user: mapUserResponse(user) });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Toggle online status (for tutors)
  static async toggleOnlineStatus(req, res) {
    try {
      const user = db.users.find(u => u.id === req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if a specific status is requested in body
      if (req.body.hasOwnProperty('isOnline')) {
        user.isOnline = req.body.isOnline;
        console.log(`🔄 ${user.name} (${user.role}) set online status to: ${user.isOnline}`);
      } else {
        // Default behavior: toggle
        user.isOnline = !user.isOnline;
        console.log(`🔄 ${user.name} (${user.role}) toggled online status to: ${user.isOnline}`);
      }
      
      db.save(); // Save status change immediately
      res.json({ isOnline: user.isOnline });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Update user email
  static async updateEmail(req, res) {
    try {
      const { newEmail } = req.body;
      
      if (!newEmail || !newEmail.includes('@')) {
        return res.status(400).json({ message: 'Please provide a valid email address' });
      }
      
      // Check if email is already in use by another user
      const existingUser = db.users.find(u => u.email === newEmail && u.id !== req.user.id);
      if (existingUser) {
        return res.status(400).json({ message: 'Email is already in use by another account' });
      }
      
      // Find current user and update email
      const user = db.users.find(u => u.id === req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const oldEmail = user.email;
      user.email = newEmail;
      
      console.log(`📧 Email updated for user ${user.name}: ${oldEmail} → ${newEmail}`);
      
      res.json({ 
        message: 'Email updated successfully',
        user: mapUserResponse(user)
      });
    } catch (error) {
      console.error('Error updating email:', error);
      res.status(500).json({ message: 'Failed to update email' });
    }
  }

  // Debug endpoints (remove in production)
  static async debugUsers(req, res) {
    try {
      const debugUsers = db.users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        subjects: user.subjects || [],
        isOnline: user.isOnline,
        rating: user.rating || 0,
        reviewCount: user.reviewCount || 0
      }));
      
      res.json({
        totalUsers: db.users.length,
        tutors: debugUsers.filter(u => u.role === 'tutor'),
        onlineTutors: debugUsers.filter(u => u.role === 'tutor' && u.isOnline),
        learners: debugUsers.filter(u => u.role === 'learner'),
        allUsers: debugUsers
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

module.exports = UserController;