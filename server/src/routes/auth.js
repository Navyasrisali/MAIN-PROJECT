const express = require('express');
const AuthController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const upload = require('../config/multer');

const router = express.Router();

const certificateUploadMiddleware = (req, res, next) => {
	upload.fields([
		{ name: 'certificate', maxCount: 10 },
		{ name: 'certificates', maxCount: 10 }
	])(req, res, (error) => {
		if (error) {
			return res.status(400).json({ message: error.message || 'Invalid certificate upload request' });
		}
		next();
	});
};

// Authentication routes (no auth required)
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Protected routes (require authentication)
router.post('/logout', authMiddleware, AuthController.logout);

// Password reset routes
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/verify-otp', AuthController.verifyOTP);
router.post('/reset-password', AuthController.resetPassword);

// Certificate upload route (supports both single and multiple field names)
router.post(
	'/upload-certificate',
	authMiddleware,
	certificateUploadMiddleware,
	AuthController.uploadCertificate
);

module.exports = router;