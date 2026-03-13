const express = require('express');
const AuthController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const upload = require('../config/multer');

const router = express.Router();

// Authentication routes (no auth required)
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Protected routes (require authentication)
router.post('/logout', authMiddleware, AuthController.logout);

// Password reset routes
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/verify-otp', AuthController.verifyOTP);
router.post('/reset-password', AuthController.resetPassword);

// Certificate upload route
router.post('/upload-certificate', authMiddleware, upload.single('certificate'), AuthController.uploadCertificate);

module.exports = router;