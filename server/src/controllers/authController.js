const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { User } = require('../models');
const { generateOTP } = require('../utils/helpers');
const EmailService = require('../services/emailService');
const NotificationService = require('../services/notificationService');

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

// Store OTPs temporarily (in production, use Redis or database)
const otpStore = new Map();

class AuthController {
  // Register new user
  static async register(req, res) {
    try {
      const { name, email, password, role } = req.body;
      
      // Check if user exists
      const existingUser = db.users.find(u => u.email === email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user
      const userData = {
        id: db.getNextId(),
        name,
        email,
        password: hashedPassword,
        role: role || 'learner',
        isOnline: true
      };
      
      const user = new User(userData);
      db.users.push(user);
      db.save(); // Save immediately after user registration
      
      // Generate token
      const token = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );
      
      res.status(201).json({
        token,
        user: mapUserResponse(user)
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Login user
  static async login(req, res) {
    try {
      const { email, password } = req.body;
      
      // Validate input
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }
      
      // Find user
      const user = db.users.find(u => u.email === email);
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
      
      // Check if password exists and is valid
      if (!user.password || typeof user.password !== 'string') {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
      
      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
      
      // Generate token
      const token = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );
      
      // Set user online when they login
      user.isOnline = true;
      db.save(); // Save user online status
      
      res.json({
        token,
        user: mapUserResponse(user)
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Logout user
  static async logout(req, res) {
    try {
      const user = db.users.find(u => u.id === req.user.id);
      if (user) {
        user.isOnline = false;
        db.save(); // Save user offline status
      }
      
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Forgot Password - Send OTP
  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      
      const user = db.users.find(u => u.email === email);
      if (!user) {
        return res.status(404).json({ message: 'User not found with this email' });
      }
      
      // Generate OTP
      const otp = generateOTP();
      
      // Store OTP with expiration (5 minutes)
      otpStore.set(email, {
        otp,
        expiresAt: Date.now() + 5 * 60 * 1000,
        userId: user.id
      });
      
      // Send OTP email
      await EmailService.sendOTPEmail(email, user.name, otp);
      
      res.json({ message: 'OTP sent to your email address' });
    } catch (error) {
      console.error('Error sending OTP:', error);
      res.status(500).json({ message: 'Failed to send OTP' });
    }
  }

  // Verify OTP
  static verifyOTP(req, res) {
    try {
      const { email, otp } = req.body;
      
      const storedOtpData = otpStore.get(email);
      if (!storedOtpData) {
        return res.status(400).json({ message: 'OTP not found or expired' });
      }
      
      if (Date.now() > storedOtpData.expiresAt) {
        otpStore.delete(email);
        return res.status(400).json({ message: 'OTP has expired' });
      }
      
      if (storedOtpData.otp !== otp) {
        return res.status(400).json({ message: 'Invalid OTP' });
      }
      
      res.json({ 
        message: 'OTP verified successfully',
        userId: storedOtpData.userId 
      });
    } catch (error) {
      console.error('Error verifying OTP:', error);
      res.status(500).json({ message: 'Failed to verify OTP' });
    }
  }

  // Reset Password
  static async resetPassword(req, res) {
    try {
      const { email, otp, newPassword } = req.body;
      
      const storedOtpData = otpStore.get(email);
      if (!storedOtpData || storedOtpData.otp !== otp) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
      }
      
      // Find user and update password
      const user = db.users.find(u => u.id === storedOtpData.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Hash the new password before storing
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      db.save(); // Save password change
      
      // Remove OTP from store
      otpStore.delete(email);
      
      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({ message: 'Failed to reset password' });
    }
  }

  // Upload Certificate
  static async uploadCertificate(req, res) {
    try {
      const { subject } = req.body;
      const user = db.users.find(u => u.id === req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (user.role !== 'tutor') {
        // Keep upload unblocked when role is stale in persisted data.
        user.role = 'tutor';
        if (!Array.isArray(user.subjects)) {
          user.subjects = [];
        }
      }

      if (!req.file) {
        return res.status(400).json({ message: 'Please upload a certificate file' });
      }

      if (!subject || !String(subject).trim()) {
        return res.status(400).json({ message: 'Subject is required for certificate upload' });
      }

      const subjectKey = normalizeSubjectKey(subject);
      const matchedSubject = (user.subjects || []).find(s => normalizeSubjectKey(s) === subjectKey);
      if (!matchedSubject) {
        return res.status(400).json({ message: 'Selected subject is not in tutor profile' });
      }

      if (!user.subjectVerifications || typeof user.subjectVerifications !== 'object') {
        user.subjectVerifications = {};
      }

      // Save certificate URL (relative path)
      const certificateUrl = `/uploads/certificates/${req.file.filename}`;
      user.subjectVerifications[subjectKey] = {
        subject: matchedSubject,
        status: 'pending',
        certificateUrl,
        rejectionReason: null,
        uploadedAt: new Date().toISOString()
      };

      const summary = getVerificationSummary(user);
      user.isVerified = summary.isVerified;
      user.verificationStatus = summary.verificationStatus;
      db.save();

      // Notify all admins
      const admins = db.users.filter(u => u.role === 'admin');
      admins.forEach(admin => {
        NotificationService.sendNotification(
          admin.id,
          `${user.name} uploaded certificate for ${matchedSubject} verification`,
          'certificate_uploaded'
        );
      });

      res.json({ 
        message: `Certificate uploaded for ${matchedSubject}. Awaiting admin verification.`,
        subject: matchedSubject,
        certificateUrl,
        verificationStatus: user.verificationStatus,
        subjectVerifications: user.subjectVerifications
      });
    } catch (error) {
      console.error('Error uploading certificate:', error);
      res.status(500).json({ message: 'Failed to upload certificate' });
    }
  }
}

module.exports = AuthController;