const express = require('express');
const NotificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All notification routes require authentication
router.use(authMiddleware);

// Notification management routes
router.get('/', NotificationController.getNotifications);
router.put('/:id/read', NotificationController.markAsRead);
router.delete('/:id', NotificationController.deleteNotification);

module.exports = router;