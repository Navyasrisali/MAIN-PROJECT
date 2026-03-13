const express = require('express');

// Import all route modules
const authRoutes = require('./auth');
const userRoutes = require('./user');
const tutorRoutes = require('./tutor');
const learnerRoutes = require('./learner');
const requestRoutes = require('./request');
const reviewRoutes = require('./review');
const notificationRoutes = require('./notification');
const adminRoutes = require('./admin');

const router = express.Router();

// Register all routes with their base paths
router.use('/api', authRoutes);
router.use('/api/user', userRoutes);
router.use('/api/tutors', tutorRoutes);
router.use('/api/learner', learnerRoutes);
router.use('/api/request', requestRoutes);
router.use('/api/review', reviewRoutes);
router.use('/api/notifications', notificationRoutes);
router.use('/api/admin', adminRoutes);

module.exports = router;