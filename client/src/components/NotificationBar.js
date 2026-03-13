import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './NotificationBar.css';

const NotificationBar = ({ notifications, setNotifications, onRefresh }) => {
  const [showNotifications, setShowNotifications] = useState(false);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found, skipping notification fetch');
        return;
      }
      
      // Use the correct API endpoint
      const response = await axios.get('/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(response.data);
      console.log('Notifications fetched successfully');
    } catch (error) {
      console.error('Error fetching notifications:', error.response?.data || error.message);
      // Don't show error to user for notifications, just log it
    }
  };

  const handleRefresh = async () => {
    console.log('NotificationBar: Refresh clicked');
    try {
      // Always refresh notifications first
      await fetchNotifications();
      
      // Call parent's refresh function if provided
      if (onRefresh) {
        console.log('NotificationBar: Calling parent refresh function');
        onRefresh();
      }
      
      console.log('NotificationBar: Refresh completed');
    } catch (error) {
      console.error('Error during refresh:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNotifications(prevNotifications =>
        prevNotifications.map(notif =>
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error.response?.data || error.message);
    }
  };



  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="notification-bar">
      <div className="notification-controls">
        <button 
          className="refresh-btn"
          onClick={handleRefresh}
          title="Refresh data"
        >
          🔄
        </button>
        <button 
          className={`notification-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
          onClick={toggleNotifications}
        >
          🔔 <span className="notification-label">Notifications</span> {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
        </button>
      </div>

      {showNotifications && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h4>Notifications</h4>
            <button 
              className="close-btn"
              onClick={() => setShowNotifications(false)}
            >
              ✕
            </button>
          </div>
          
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">No notifications</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification ${!notification.isRead ? 'unread' : ''}`}
                  onClick={() => !notification.isRead && markAsRead(notification.id)}
                >
                  <div className="notification-content">
                    <p>{notification.message}</p>
                    <small>{new Date(notification.createdAt).toLocaleString()}</small>
                  </div>
                  <div className="notification-actions">
                    {!notification.isRead && <div className="unread-indicator"></div>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBar;