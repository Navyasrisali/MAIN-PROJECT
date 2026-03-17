import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import './App.css';

// Components
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import TutorPage from './components/TutorPage';
import LearnerPage from './components/LearnerPage';
import Profile from './components/Profile';
import AdminDashboard from './components/AdminDashboard';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://mern-learning-backend.onrender.com';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || API_BASE_URL;

// Set up axios defaults
axios.defaults.baseURL = `${API_BASE_URL}/api`;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Get user data from token (you could also make an API call)
      try {
        const userData = JSON.parse(localStorage.getItem('user'));
        if (userData) {
          setUser(userData);
          
          // Initialize socket connection
          const newSocket = io(SOCKET_URL);
          console.log('🔌 Socket connecting to server...');
          
          newSocket.on('connect', () => {
            console.log('✅ Socket connected with ID:', newSocket.id);
            console.log('📡 Joining room for user ID:', userData.id);
            newSocket.emit('join', userData.id);
          });
          
          newSocket.on('disconnect', () => {
            console.log('❌ Socket disconnected');
          });
          
          newSocket.on('connect_error', (error) => {
            console.error('❌ Socket connection error:', error);
          });
          
          setSocket(newSocket);
          
          // Listen for notifications
          newSocket.on('notification', (notification) => {
            setNotifications(prev => [notification, ...prev]);
          });
          
          // Listen for status updates from server
          newSocket.on('statusUpdate', (statusData) => {
            console.log('App.js: Received status update:', statusData);
            const updatedUser = { ...userData, isOnline: statusData.isOnline };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
          });
          
          // Listen for rating updates from reviews
          newSocket.on('ratingUpdated', (ratingUpdate) => {
            // Update user rating if this is the tutor who received the review
            setUser(currentUser => {
              if (currentUser && currentUser.id === ratingUpdate.tutorId) {
                const updatedUser = { 
                  ...currentUser, 
                  rating: ratingUpdate.newRating,
                  reviewCount: ratingUpdate.newReviewCount,
                  lastUpdated: Date.now() // Force re-render trigger
                };
                
                // Update localStorage
                localStorage.setItem('user', JSON.stringify(updatedUser));
                console.log('✅ Updated rating:', ratingUpdate.newRating, 'reviews:', ratingUpdate.newReviewCount);
                
                return updatedUser;
              }
              return currentUser;
            });
          });
          
          // Update user online status when socket connects
          newSocket.on('connect', () => {
            console.log('App.js: Socket connected, setting user online');
            const updatedUser = { ...userData, isOnline: true };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
          });
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
    
    // Initialize socket connection
    const newSocket = io(SOCKET_URL);
    console.log('🔌 Socket connecting to server (login)...');
    
    newSocket.on('connect', () => {
      console.log('✅ Socket connected with ID:', newSocket.id);
      console.log('📡 Joining room for user ID:', userData.id);
      newSocket.emit('join', userData.id);
      
      const updatedUser = { ...userData, isOnline: true };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    });
    
    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });
    
    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
    });
    
    setSocket(newSocket);
    
    // Listen for notifications
    newSocket.on('notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
    });
  };

  const logout = async () => {
    try {
      // Call logout endpoint to set user offline
      await axios.post('/logout');
    } catch (error) {
      console.error('Error during logout:', error);
      // Continue with logout even if API call fails
    }
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    setNotifications([]);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        {user && (
          <div className="navbar">
            <div className="nav-content">
              <h1>Peer Learning Platform</h1>
              <div className="nav-right">
                <span>Welcome, {user.name}</span>
                <button 
                  onClick={() => setShowProfile(true)} 
                  className="profile-btn"
                  title="View Profile"
                >
                  👤 Profile
                </button>
                <button onClick={logout} className="logout-btn">Logout</button>
              </div>
            </div>
          </div>
        )}
        
        <Routes>
          <Route
            path="/"
            element={
              user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/login"
            element={
              user ? <Navigate to="/dashboard" /> : <Login onLogin={login} />
            }
          />
          <Route
            path="/register"
            element={
              user ? <Navigate to="/dashboard" /> : <Register />
            }
          />
          <Route
            path="/dashboard"
            element={
              user ? <Dashboard user={user} updateUser={updateUser} /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/tutor"
            element={
              user ? (
                <TutorPage 
                  key={`${user.id}-${user.rating}-${user.reviewCount}-${user.lastUpdated || 0}`}
                  user={user} 
                  updateUser={updateUser} 
                  notifications={notifications} 
                  setNotifications={setNotifications}
                  socket={socket}
                />
              ) : <Navigate to="/login" />
            }
          />
          <Route
            path="/learner"
            element={
              user ? (
                <LearnerPage 
                  user={user} 
                  notifications={notifications} 
                  setNotifications={setNotifications}
                  socket={socket}
                />
              ) : <Navigate to="/login" />
            }
          />
          <Route
            path="/admin"
            element={
              user && user.role === 'admin' ? (
                <AdminDashboard user={user} />
              ) : <Navigate to="/login" />
            }
          />
        </Routes>
        
        {/* Profile Modal */}
        {showProfile && user && (
          <Profile 
            user={user}
            updateUser={updateUser}
            onClose={() => setShowProfile(false)}
          />
        )}
      </div>
    </Router>
  );
}

export default App;
