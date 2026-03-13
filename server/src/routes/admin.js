const express = require('express');
const AdminController = require('../controllers/adminController');
const adminMiddleware = require('../middleware/adminAuth');

const router = express.Router();

// All admin routes require admin authentication
router.use(adminMiddleware);

// Get pending certificate verifications
router.get('/verifications/pending', AdminController.getPendingVerifications);

// Get all tutors
router.get('/tutors', AdminController.getAllTutors);

// Approve certificate
router.put('/tutors/:tutorId/approve', AdminController.approveCertificate);

// Reject certificate
router.put('/tutors/:tutorId/reject', AdminController.rejectCertificate);

// Get platform statistics
router.get('/statistics', AdminController.getStatistics);

// Get all users
router.get('/users', AdminController.getAllUsers);

module.exports = router;
