const db = require('../config/database');
const socketManager = require('../config/socket');
const { Notification } = require('../models');

class NotificationService {
  // Send notification to a specific user
  static async sendNotification(userId, message, type) {
    try {
      const notification = new Notification({
        id: db.getNextId(),
        user: userId,
        message,
        type,
        isRead: false,
        createdAt: new Date()
      });
      
      db.notifications.push(notification);
      
      // Emit to specific user via socket
      socketManager.emitToUser(userId, 'notification', notification);
      
      console.log(`📢 Notification sent to user ${userId}: ${message}`);
      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  // Get notifications for a user
  static getUserNotifications(userId, limit = 20) {
    return db.notifications
      .filter(n => n.user === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }

  // Mark notification as read
  static markAsRead(notificationId) {
    const notification = db.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.isRead = true;
      db.save(); // Save the read status
      return true;
    }
    return false;
  }

  // Delete notification
  static deleteNotification(notificationId, userId) {
    console.log(`🗑️ Backend: Attempting to delete notification ${notificationId} for user ${userId}`);
    
    const notificationIndex = db.notifications.findIndex(n => n.id === notificationId && n.user === userId);
    console.log(`🔍 Backend: Notification index found: ${notificationIndex}`);
    
    if (notificationIndex !== -1) {
      const deletedNotification = db.notifications[notificationIndex];
      console.log(`📄 Backend: Deleting notification:`, deletedNotification);
      
      db.notifications.splice(notificationIndex, 1);
      db.save(); // Save after deletion
      
      console.log(`✅ Backend: Notification deleted successfully, remaining count: ${db.notifications.length}`);
      return true;
    }
    
    console.log(`❌ Backend: Notification not found or user mismatch`);
    return false;
  }
}

module.exports = NotificationService;