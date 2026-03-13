import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import ForgotPassword from './ForgotPassword';
import './Auth.css';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/login', formData);
      onLogin(response.data.user, response.data.token);
    } catch (error) {
      setError(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/login', {
        email: 'admin@peerlearning.com',
        password: 'admin123'
      });
      onLogin(response.data.user, response.data.token);
    } catch (error) {
      setError(error.response?.data?.message || 'Admin login failed');
    } finally {
      setLoading(false);
    }
  };

  // Show Forgot Password component if requested
  if (showForgotPassword) {
    return (
      <ForgotPassword 
        onBack={() => setShowForgotPassword(false)}
        onSuccess={() => {
          setShowForgotPassword(false);
          setError('');
          alert('Password reset successfully! Please login with your new password.');
        }}
      />
    );
  }

  // Regular login form
  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>🎓 Login to Peer Learning</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <div className="admin-login-section">
          <div className="divider">
            <span>OR</span>
          </div>
          <button 
            type="button" 
            onClick={handleAdminLogin}
            disabled={loading}
            className="admin-login-btn"
          >
            🔐 Login as Admin
          </button>
        </div>
        
        <div className="forgot-password-link">
          <button 
            type="button" 
            onClick={() => setShowForgotPassword(true)}
            className="link-btn"
          >
            Forgot Password?
          </button>
        </div>
        
        <p>
          Don't have an account? <Link to="/register">Sign up here</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;