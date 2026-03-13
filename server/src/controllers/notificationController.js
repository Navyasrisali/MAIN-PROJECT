const NotificationService = require('../services/notificationService');

class NotificationController {
  // Get notifications for user
  static async getNotifications(req, res) {
    try {
      const notifications = NotificationService.getUserNotifications(req.user.id);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Mark notification as read
  static async markAsRead(req, res) {
    try {
      const success = NotificationService.markAsRead(parseInt(req.params.id));
      if (success) {
        res.json({ message: 'Notification marked as read' });
      } else {
        res.status(404).json({ message: 'Notification not found' });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Delete notification
  static async deleteNotification(req, res) {
    try {
      console.log(`🎯 Controller: DELETE request for notification ${req.params.id} from user ${req.user.id}`);
      
      const success = NotificationService.deleteNotification(parseInt(req.params.id), req.user.id);
      if (success) {
        console.log(`✅ Controller: Notification ${req.params.id} deleted successfully`);
        res.json({ message: 'Notification deleted successfully' });
      } else {
        console.log(`❌ Controller: Notification ${req.params.id} not found or unauthorized`);
        res.status(404).json({ message: 'Notification not found' });
      }
    } catch (error) {
      console.error(`💥 Controller: Error deleting notification ${req.params.id}:`, error);
      res.status(500).json({ message: error.message });
    }
  }
}

module.exports = NotificationController;