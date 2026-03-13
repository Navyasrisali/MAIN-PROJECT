const express = require('express');
const UserController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All user routes require authentication
router.use(authMiddleware);

// User management routes
router.put('/role', UserController.updateRole);
router.put('/online', UserController.toggleOnlineStatus);
router.put('/update-email', UserController.updateEmail);

// Debug routes (remove in production)
router.get('/debug/users', UserController.debugUsers);

module.exports = router;