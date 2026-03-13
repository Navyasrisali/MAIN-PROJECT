import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import NotificationBar from './NotificationBar';
import CertificateUpload from './CertificateUpload';
import VideoCall from './VideoCall';
import './TutorPage.css';
import './ReviewAlert.css';

const TutorPage = ({ user, updateUser, notifications, setNotifications, socket }) => {
  const [subjects, setSubjects] = useState(user.subjects || []);
  const [newSubject, setNewSubject] = useState('');
  const [isOnline, setIsOnline] = useState(user.isOnline || false);
  const [requests, setRequests] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const isFetchingRequests = useRef(false);
  const isFetchingSessions = useRef(false);
  
  // Check if user has completed initial setup - store in localStorage to persist across sessions
  const getInitialSubjectSetup = () => {
    const hasCompletedSetup = localStorage.getItem(`tutorSetup_${user.id}`);
    if (hasCompletedSetup === 'true') {
      return false; // Setup is complete
    }
    return !user.subjects || user.subjects.length === 0; // Setup needed
  };
  
  const [subjectSetup, setSubjectSetup] = useState(getInitialSubjectSetup());
  
  // Store active tab in localStorage to persist across page switches
  const getInitialActiveTab = () => {
    return localStorage.getItem(`tutorActiveTab_${user.id}`) || 'requests';
  };
  
  const [activeTab, setActiveTab] = useState(getInitialActiveTab());
  const [newReviewAlert, setNewReviewAlert] = useState(null); // For showing new review notifications
  const [currentRating, setCurrentRating] = useState(user.rating || 0);
  const [currentReviewCount, setCurrentReviewCount] = useState(user.reviewCount || 0);
  const [ratingUpdateTrigger, setRatingUpdateTrigger] = useState(0); // Force re-render trigger
  const [activeVideoCall, setActiveVideoCall] = useState(null); // { requestId, learnerId, learnerName }

  // Update isOnline state when user prop changes
  useEffect(() => {
    setIsOnline(user.isOnline || false);
    // Always sync local state with user prop when it changes
    if (user.rating !== undefined) setCurrentRating(user.rating);
    if (user.reviewCount !== undefined) setCurrentReviewCount(user.reviewCount);
  }, [user.isOnline, user.rating, user.reviewCount]);

  // Sync online status with server when component mounts
  useEffect(() => {
    const syncOnlineStatus = async () => {
      if (user.isOnline && !subjectSetup) {
        try {
          // Ensure server knows we're online
          await axios.put('/tutors/online', {
            isOnline: true
          });
          console.log('TutorPage: Synced online status with server');
        } catch (error) {
          console.error('Error syncing online status:', error);
        }
      }
    };
    
    syncOnlineStatus();
  }, [user.isOnline, subjectSetup]);

  useEffect(() => {
    if (!subjectSetup) {
      console.log('⚙️ TutorPage: subjectSetup changed to false, fetching data...');
      fetchRequests();
      fetchSessions();
    } else {
      console.log('⚙️ TutorPage: subjectSetup is true, skipping fetch');
    }
  }, [subjectSetup]);

  // Fetch sessions when component mounts
  useEffect(() => {
    fetchSessions();
  }, []);

  // Fetch sessions when switching to sessions tab
  useEffect(() => {
    if (activeTab === 'sessions') {
      fetchSessions();
    }
  }, [activeTab]);

  // Listen for real-time rating updates
  useEffect(() => {
    if (socket) {
      const handleRatingUpdate = (ratingUpdate) => {
        console.log('🌟 TutorPage: Received rating update:', ratingUpdate);
        if (ratingUpdate.tutorId === user.id) {
          console.log('� TutorPage: This update is for me!');
          
          // Update local state immediately for instant UI update
          setCurrentRating(ratingUpdate.newRating);
          setCurrentReviewCount(ratingUpdate.newReviewCount);
          
          console.log('📊 TutorPage: Updated local states:', {
            newRating: ratingUpdate.newRating,
            newReviewCount: ratingUpdate.newReviewCount
          });
          
          // Show visual feedback for new review
          setNewReviewAlert({
            rating: ratingUpdate.latestReview.rating,
            learnerName: ratingUpdate.latestReview.learnerName,
            comment: ratingUpdate.latestReview.comment
          });
          
          // Auto-hide alert after 5 seconds
          setTimeout(() => {
            setNewReviewAlert(null);
          }, 5000);
          
          // Refresh sessions to show updated data
          fetchSessions();
        }
      };

      socket.on('ratingUpdated', handleRatingUpdate);
      
      return () => {
        socket.off('ratingUpdated', handleRatingUpdate);
      };
    }
  }, [socket, user.id]);

  const fetchRequests = async () => {
    if (isFetchingRequests.current) {
      console.log('⏭️ TutorPage: Already fetching requests, skipping...');
      return;
    }
    
    isFetchingRequests.current = true;
    try {
      console.log('🔍 TutorPage: Fetching requests for tutor ID:', user.id);
      const response = await axios.get('/tutors/requests');
      console.log('📋 TutorPage: Raw response from /tutors/requests:', response.data);
      console.log('📊 TutorPage: Number of requests received:', response.data.length);
      setRequests(response.data);
    } catch (error) {
      console.error('❌ TutorPage: Error fetching requests:', error);
      console.error('❌ TutorPage: Error details:', error.response?.data);
    } finally {
      isFetchingRequests.current = false;
    }
  };

  const fetchSessions = async () => {
    if (isFetchingSessions.current) {
      console.log('⏭️ TutorPage: Already fetching sessions, skipping...');
      return;
    }
    
    isFetchingSessions.current = true;
    try {
      console.log('🔍 TutorPage: Fetching sessions for tutor ID:', user.id);
      const response = await axios.get('/tutors/sessions');
      console.log('📚 TutorPage: Raw response from /tutors/sessions:', response.data);
      console.log('� TutorPage: Number of sessions received:', response.data.length);
      
      // Log each session's details
      response.data.forEach((session, index) => {
        console.log(`Session ${index + 1}:`, {
          id: session.id,
          status: session.status,
          subject: session.subject,
          learner: session.learner?.name
        });
      });
      
      setSessions(response.data);
      
      // Calculate review statistics from sessions
      const sessionsWithReviews = response.data.filter(session => session.review);
      const totalReviews = sessionsWithReviews.length;
      const averageRating = totalReviews > 0 
        ? sessionsWithReviews.reduce((sum, session) => sum + session.review.rating, 0) / totalReviews 
        : 0;
      
      // Update user object with calculated values using updateUser prop
      updateUser({
        ...user,
        rating: averageRating,
        reviewCount: totalReviews
      });
      
    } catch (error) {
      console.error('❌ TutorPage: Error fetching sessions:', error);
      console.error('❌ TutorPage: Error details:', error.response?.data);
    } finally {
      isFetchingSessions.current = false;
    }
  };

  const completeSession = async (sessionId) => {
    try {
      await axios.put(`/request/${sessionId}/complete`);
      console.log('✅ Session marked as complete');
      fetchRequests();
      fetchSessions();
    } catch (error) {
      console.error('Error completing session:', error);
    }
  };

  const handleSubjectSubmit = async (e) => {
    e.preventDefault();
    if (!newSubject.trim()) return;

    const updatedSubjects = [...subjects, newSubject.trim()];
    setSubjects(updatedSubjects);
    setNewSubject('');

    try {
      const response = await axios.put('/user/role', {
        role: 'tutor',
        subjects: updatedSubjects
      });
      updateUser(response.data.user);
    } catch (error) {
      console.error('Error updating subjects:', error);
    }
  };

  const removeSubject = async (index) => {
    const updatedSubjects = subjects.filter((_, i) => i !== index);
    setSubjects(updatedSubjects);

    try {
      const response = await axios.put('/user/role', {
        role: 'tutor',
        subjects: updatedSubjects
      });
      updateUser(response.data.user);
    } catch (error) {
      console.error('Error updating subjects:', error);
    }
  };

  const handleSubjectSetupComplete = () => {
    if (subjects.length > 0) {
      setSubjectSetup(false);
      // Mark setup as completed in localStorage
      localStorage.setItem(`tutorSetup_${user.id}`, 'true');
      fetchRequests();
    }
  };

  const handleRefresh = async () => {
    console.log('TutorPage: Refresh requested');
    try {
      // Refresh all data without changing the setup state
      if (!subjectSetup) {
        console.log('TutorPage: Refreshing requests and sessions');
        await Promise.all([
          fetchRequests(),
          fetchSessions()
        ]);
        console.log('TutorPage: Refresh completed');
      } else {
        console.log('TutorPage: In subject setup mode, skipping refresh');
      }
    } catch (error) {
      console.error('TutorPage: Error during refresh:', error);
    }
  };

  // Helper function to handle tab changes with localStorage persistence
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    localStorage.setItem(`tutorActiveTab_${user.id}`, tab);
  };

  const toggleOnlineStatus = async () => {
    setLoading(true);
    const previousStatus = isOnline;
    
    try {
      // Send the opposite of current status to toggle it properly
      const newStatus = !isOnline;
      console.log(`TutorPage: Attempting to change status from ${isOnline} to ${newStatus}`);
      
      const response = await axios.put('/tutors/online', {
        isOnline: newStatus
      });
      
      console.log(`TutorPage: Server response:`, response.data);
      
      // Update local state
      setIsOnline(response.data.isOnline);
      
      // Update user object
      const updatedUser = { ...user, isOnline: response.data.isOnline };
      updateUser(updatedUser);
      
      console.log(`TutorPage: Status successfully changed to ${response.data.isOnline}`);
    } catch (error) {
      console.error('Error toggling online status:', error.response?.data || error.message);
      // Revert to previous status on error
      setIsOnline(previousStatus);
      alert(`Failed to update online status: ${error.response?.data?.message || error.message}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestResponse = async (requestId, status) => {
    try {
      console.log(`🎯 TutorPage: ${status === 'accepted' ? 'Accepting' : 'Rejecting'} request ID:`, requestId);
      const response = await axios.put(`/request/${requestId}/respond`, { status });
      console.log('✅ Request response sent:', status);
      console.log('📦 Response data:', response.data);
      
      if (status === 'accepted') {
        console.log('🔄 TutorPage: Refreshing both requests and sessions...');
        
        // Store request data BEFORE async operations that update state
        const request = requests.find(r => r.id === requestId);
        if (!request) {
          console.error('❌ Request not found in state!');
          return;
        }
        
        // request.learner is the learner's ID (number), not an object
        const videoCallData = {
          requestId: requestId,
          learnerId: typeof request.learner === 'object' ? request.learner.id : request.learner,
          learnerName: typeof request.learner === 'object' ? request.learner.name : 'Learner'
        };
        
        console.log('📋 Video call data prepared:', videoCallData);
        
        // Immediately refresh both requests and sessions
        await Promise.all([
          fetchRequests(), // Remove from pending requests
          fetchSessions()  // Add to sessions
        ]);
        
        console.log('🎯 TutorPage: Data refreshed, starting video call after delay...');
        
        // Switch to sessions tab first
        setActiveTab('sessions');
        
        // Wait a moment to ensure learner's VideoCall component is mounted
        setTimeout(() => {
          console.log('📹 TutorPage: Initiating video call now with data:', videoCallData);
          setActiveVideoCall(videoCallData);
        }, 1000); // 1 second delay to ensure learner is ready
        
        console.log('✅ TutorPage: Request accepted! Video call will start in 1 second');
      } else {
        // For rejected requests, just refresh the requests list
        await fetchRequests();
      }
      
    } catch (error) {
      console.error('❌ Error responding to request:', error);
      console.error('❌ Error details:', error.response?.data);
      // Refresh requests on error to sync with server
      await fetchRequests();
    }
  };

  const handleCallEnd = async () => {
    // Auto-complete session when call ends
    const callInfo = activeVideoCall;
    setActiveVideoCall(null);
    
    if (callInfo && callInfo.requestId) {
      try {
        await axios.put(`/request/${callInfo.requestId}/complete`);
        console.log('✅ Session auto-completed after video call');
        await fetchSessions();
      } catch (error) {
        console.error('Error auto-completing session:', error);
      }
    }
  };

  const handleStartVideoCall = (session) => {
    console.log('🎬 Manual video call start requested for session:', session);
    console.log('📋 Full session object:', JSON.stringify(session, null, 2));
    
    // Validate session data
    if (!session.learner) {
      console.error('❌ Session missing learner property:', session);
      alert('Error: Cannot start video call - learner information is missing. Please refresh the page and try again.');
      return;
    }
    
    console.log('📋 Learner object:', session.learner);
    console.log('📋 Learner type:', typeof session.learner);
    console.log('📋 Learner.id:', session.learner.id);
    
    // Start video call manually for accepted sessions
    const learnerId = typeof session.learner === 'object' ? session.learner.id : session.learner;
    
    console.log('📋 Extracted learnerId:', learnerId, 'Type:', typeof learnerId);
    
    // Check if learnerId is a valid number (including 0)
    if (learnerId === undefined || learnerId === null || learnerId === '') {
      console.error('❌ Invalid learner ID extracted:', learnerId);
      console.error('❌ Session learner object:', session.learner);
      alert('Error: Cannot start video call - learner ID is missing. Please refresh the page and try again.');
      return;
    }
    
    const videoCallData = {
      requestId: session.id,
      learnerId: learnerId,
      learnerName: typeof session.learner === 'object' ? session.learner.name : 'Learner'
    };
    
    console.log('📹 Setting video call with data:', videoCallData);
    setActiveVideoCall(videoCallData);
  };

  if (subjectSetup) {
    return (
      <div className="tutor-container">
        <div className="subject-setup">
          <h2>Set Up Your Expertise</h2>
          <p>What subjects are you expert in?</p>
          
          <form onSubmit={handleSubjectSubmit} className="subject-form">
            <input
              type="text"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="Enter a subject (e.g., Mathematics, Physics, Programming)"
              required
            />
            <button type="submit">Add Subject</button>
          </form>
          
          {subjects.length > 0 && (
            <div className="subjects-list">
              <h3>Your Subjects:</h3>
              <div className="subjects-tags">
                {subjects.map((subject, index) => (
                  <div key={index} className="subject-tag">
                    {subject}
                    <button onClick={() => removeSubject(index)} className="remove-subject">×</button>
                  </div>
                ))}
              </div>
              <button onClick={handleSubjectSetupComplete} className="complete-setup-btn">
                Complete Setup
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="tutor-container">
      {/* Show video call if active */}
      {activeVideoCall && socket && (
        <>
          {console.log('🎥 TutorPage: Rendering VideoCall with props:', {
            requestId: activeVideoCall.requestId,
            localUserId: user.id,
            remoteUserId: activeVideoCall.learnerId,
            isInitiator: true
          })}
          <VideoCall
            socket={socket}
            requestId={activeVideoCall.requestId}
            localUserId={user.id}
            remoteUserId={activeVideoCall.learnerId}
            isInitiator={true} // Tutor initiates the call
            onCallEnd={handleCallEnd}
          />
        </>
      )}

      {/* New Review Alert */}
      {newReviewAlert && (
        <div className="new-review-alert">
          <div className="alert-content">
            <div className="alert-header">
              <span className="alert-icon">🌟</span>
              <strong>New Review Received!</strong>
            </div>
            <div className="alert-body">
              <p><strong>{newReviewAlert.learnerName}</strong> gave you <strong>{newReviewAlert.rating} stars!</strong></p>
              {newReviewAlert.comment && (
                <p className="review-comment">"{newReviewAlert.comment}"</p>
              )}
            </div>
            <button 
              className="alert-close"
              onClick={() => setNewReviewAlert(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      <div className="tutor-header">
        <h2>Tutor Dashboard</h2>
        <div className="status-control">
          <NotificationBar 
            notifications={notifications} 
            setNotifications={setNotifications} 
            onRefresh={handleRefresh}
          />
          <span>Status: </span>
          <button
            onClick={toggleOnlineStatus}
            disabled={loading}
            className={`status-btn ${isOnline ? 'online' : 'offline'}`}
          >
            {isOnline ? '🟢 Online' : '🔴 Offline'}
          </button>
        </div>
      </div>

      <div className="tutor-content">
        {/* Certificate Upload Section */}
        <CertificateUpload user={user} updateUser={updateUser} />
        
        <div className="subjects-section">
          <h3>Your Subjects</h3>
          <div className="subjects-display">
            {subjects.map((subject, index) => (
              <span key={index} className="subject-badge">{subject}</span>
            ))}
          </div>
          <button onClick={() => setSubjectSetup(true)} className="edit-subjects-btn">
            Edit Subjects
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="tabs-navigation">
          <button 
            className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => handleTabChange('requests')}
          >
            Pending Requests ({requests.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
            onClick={() => handleTabChange('sessions')}
          >
            My Sessions ({sessions.length})
          </button>
        </div>

        {/* Requests Section */}
        {activeTab === 'requests' && (
          <div className="requests-section">
            {requests.length === 0 ? (
              <div className="no-requests">
                <p>No pending requests at the moment.</p>
                <p>Make sure you're online to receive requests!</p>
              </div>
            ) : (
              <div className="requests-list">
                {requests.map((request) => {
                  const statusColor = {
                    'pending': '#ffc107',
                    'accepted': '#28a745', 
                    'completed': '#6c757d',
                    'rejected': '#dc3545'
                  }[request.status] || '#ffc107';

                  return (
                    <div key={request.id} className="request-card">
                      <div className="request-info">
                        <h4>👤 {request.learner.name}</h4>
                        <p><strong>📚 Subject:</strong> {request.subject}</p>
                        <p><strong>📧 Email:</strong> {request.learner.email}</p>
                        <p><strong>💬 Message:</strong> {request.message}</p>
                        <p><strong>📅 Requested:</strong> {new Date(request.createdAt).toLocaleString()}</p>
                        <div className="request-status" style={{ color: statusColor }}>
                          <strong>Status:</strong> {request.status.toUpperCase()}
                        </div>
                      </div>
                      
                      <div className="request-actions">
                        {request.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleRequestResponse(request.id, 'accepted')}
                              className="accept-btn"
                              style={{
                                backgroundColor: '#28a745',
                                color: 'white',
                                border: 'none',
                                padding: '8px 15px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                marginRight: '10px'
                              }}
                            >
                              ✅ Accept
                            </button>
                            <button
                              onClick={() => handleRequestResponse(request.id, 'rejected')}
                              className="reject-btn"
                              style={{
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                padding: '8px 15px',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              ❌ Reject
                            </button>
                          </>
                        )}
                        
                        {request.status === 'completed' && (
                          <div className="completed-status">
                            <p style={{ color: '#6c757d', fontWeight: 'bold' }}>
                              ✅ Session Completed
                            </p>
                          </div>
                        )}
                        
                        {request.status === 'rejected' && (
                          <div className="rejected-status">
                            <p style={{ color: '#dc3545', fontWeight: 'bold' }}>
                              ❌ Request Rejected
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Sessions Section */}
        {activeTab === 'sessions' && (
          <div className="sessions-section">
            <div style={{ marginBottom: '15px', textAlign: 'right' }}>
              <button 
                onClick={() => {
                  console.log('🔄 Manual refresh requested');
                  fetchSessions();
                }}
                style={{
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '8px 15px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                🔄 Refresh Sessions
              </button>
            </div>
            {sessions.length === 0 ? (
              <div className="no-sessions">
                <p>No sessions yet.</p>
                <p>Accept some requests to start teaching!</p>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
                  Debug: User ID = {user.id}, Sessions count = {sessions.length}
                </p>
              </div>
            ) : (
              <div className="sessions-list">
                {sessions.map((session) => {
                  const statusColor = {
                    'pending': '#ffc107',
                    'accepted': '#28a745', 
                    'completed': '#6c757d',
                    'cancelled': '#dc3545'
                  }[session.status] || '#6c757d';

                  return (
                    <div key={session.id} className="session-card">
                      <div className="session-info">
                        <h4>📚 {session.subject}</h4>
                        <p><strong>👤 Learner:</strong> {session.learner?.name || 'Unknown'}</p>
                        <p><strong>📧 Email:</strong> {session.learner?.email || 'Unknown'}</p>
                        <p><strong> Date:</strong> {new Date(session.createdAt).toLocaleString()}</p>
                        <div className="session-status" style={{ color: statusColor }}>
                          <strong>Status:</strong> {session.status.toUpperCase()}
                        </div>
                        
                        {session.status === 'accepted' && (
                          <div className="meeting-info">
                            <div className="session-actions" style={{ marginTop: '1rem' }}>
                              <button 
                                onClick={() => handleStartVideoCall(session)}
                                className="video-call-btn"
                                style={{
                                  backgroundColor: '#007bff',
                                  color: 'white',
                                  border: 'none',
                                  padding: '8px 15px',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  marginRight: '10px'
                                }}
                              >
                                📹 Start Video Call
                              </button>
                              <button 
                                onClick={() => completeSession(session.id)}
                                className="complete-session-btn"
                                style={{
                                  backgroundColor: '#28a745',
                                  color: 'white',
                                  border: 'none',
                                  padding: '8px 15px',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                ✅ Mark Complete
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {(session.status === 'completed' || session.status === 'reviewed') && (
                          <div className="completed-info">
                            <p style={{ color: '#28a745' }}>✅ Session completed</p>
                            {session.review && (
                              <div className="review-info">
                                <p><strong>⭐ Rating:</strong> {session.review.rating}/5</p>
                                <p><strong>💬 Review:</strong> {session.review.comment}</p>
                              </div>
                            )}
                            {!session.review && session.status === 'completed' && (
                              <p style={{ color: '#ffc107' }}>⏳ Waiting for learner review...</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Stats Section */}
        <div className="stats-section">
          <div className="stat-card">
            <h4>Rating</h4>
            <div className="rating">
              {'⭐'.repeat(Math.max(0, Math.min(5, Math.round(user.rating || 0))))}
              <span>({Number(user.rating || 0).toFixed(1)})</span>
            </div>
          </div>
          <div className="stat-card">
            <h4>Total Reviews</h4>
            <p>{Number(user.reviewCount || 0)}</p>
            <small style={{ color: '#666' }}>Reviews: {user.reviewCount}, Rating: {user.rating}</small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorPage;
