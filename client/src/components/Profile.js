import React, { useState } from 'react';
import axios from 'axios';
import './Profile.css';

const Profile = ({ user, updateUser, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newEmail, setNewEmail] = useState(user.email);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleEmailUpdate = async (e) => {
    e.preventDefault();
    
    if (newEmail === user.email) {
      setIsEditing(false);
      return;
    }

    if (!newEmail || !newEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.put('/user/update-email', { 
        newEmail 
      });
      
      // Update user object with new email
      updateUser({
        ...user,
        email: newEmail
      });
      
      setSuccess('Email updated successfully!');
      setIsEditing(false);
      
      setTimeout(() => {
        setSuccess('');
      }, 3000);
      
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update email');
      setNewEmail(user.email); // Reset to original email
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setNewEmail(user.email);
    setIsEditing(false);
    setError('');
    setSuccess('');
  };

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="profile-header">
          <h3>👤 My Profile</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="profile-content">
          <div className="profile-info">
            <div className="info-item">
              <label>📛 Name:</label>
              <span className="info-value">{user.name}</span>
            </div>
            
            <div className="info-item">
              <label>👤 Role:</label>
              <span className="info-value role-badge">
                {user.role === 'tutor' ? '🎓 Tutor' : '📚 Learner'}
              </span>
            </div>
            
            <div className="info-item">
              <label>📧 Email:</label>
              {isEditing ? (
                <form onSubmit={handleEmailUpdate} className="email-edit-form">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter new email"
                    className="email-input"
                    required
                  />
                  <div className="edit-actions">
                    <button 
                      type="submit" 
                      disabled={loading}
                      className="save-btn"
                    >
                      {loading ? '💾 Saving...' : '💾 Save'}
                    </button>
                    <button 
                      type="button" 
                      onClick={handleCancel}
                      className="cancel-btn"
                    >
                      ❌ Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="email-display">
                  <span className="info-value">{user.email}</span>
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="edit-email-btn"
                  >
                    ✏️ Edit
                  </button>
                </div>
              )}
            </div>

            {user.role === 'tutor' && (
              <>
                <div className="info-item">
                  <label>⭐ Rating:</label>
                  <span className="info-value">
                    {user.rating ? `${user.rating}/5` : 'No ratings yet'}
                  </span>
                </div>
                
                <div className="info-item">
                  <label>📊 Total Reviews:</label>
                  <span className="info-value">{user.reviewCount || 0}</span>
                </div>
              </>
            )}
            
            <div className="info-item">
              <label>🌐 Status:</label>
              <span className={`status-indicator ${user.isOnline ? 'online' : 'offline'}`}>
                {user.isOnline ? '🟢 Online' : '🔴 Offline'}
              </span>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
        </div>
      </div>
    </div>
  );
};

export default Profile;