import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = ({ user, updateUser }) => {
  const navigate = useNavigate();

  // Auto-redirect admin to admin dashboard
  useEffect(() => {
    if (user.role === 'admin') {
      navigate('/admin');
    }
  }, [user.role, navigate]);

  const handleRoleSelection = (role) => {
    // Update user role and navigate
    updateUser({ ...user, role });
    
    if (role === 'tutor') {
      navigate('/tutor');
    } else {
      navigate('/learner');
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        <h1>Welcome to Peer Learning Platform</h1>
        <p>How would you like to participate today?</p>
        
        {/* Admin Dashboard Access */}
        {user.role === 'admin' && (
          <div className="admin-access">
            <button 
              onClick={() => navigate('/admin')}
              className="admin-btn"
            >
              🔐 Admin Dashboard
            </button>
          </div>
        )}
        
        <div className="role-selection">
          <div className="role-card" onClick={() => handleRoleSelection('tutor')}>
            <div className="role-icon">👨‍🏫</div>
            <h3>Be a Tutor</h3>
            <p>Share your knowledge and help others learn</p>
            <div className="features">
              <ul>
                <li>Set your expertise subjects</li>
                <li>Accept learning requests</li>
                <li>Schedule sessions</li>
                <li>Earn reviews and ratings</li>
              </ul>
            </div>
            <button className="role-btn tutor-btn">Start Teaching</button>
          </div>
          
          <div className="role-card" onClick={() => handleRoleSelection('learner')}>
            <div className="role-icon">👨‍🎓</div>
            <h3>Be a Learner</h3>
            <p>Find expert tutors and expand your knowledge</p>
            <div className="features">
              <ul>
                <li>Search for subject experts</li>
                <li>Request tutoring sessions</li>
                <li>Join online meetings</li>
                <li>Rate your experience</li>
              </ul>
            </div>
            <button className="role-btn learner-btn">Start Learning</button>
          </div>
        </div>
        
        {user.role && (
          <div className="current-role">
            <p>Current role: <span className={`role-badge ${user.role}`}>{user.role}</span></p>
            <button 
              onClick={() => navigate(user.role === 'tutor' ? '/tutor' : '/learner')}
              className="continue-btn"
            >
              Continue as {user.role}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;