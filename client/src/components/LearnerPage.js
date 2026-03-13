import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReviewModal from './ReviewModal';
import NotificationBar from './NotificationBar';
import VideoCall from './VideoCall';
import './LearnerPage.css';
import './CompletedSession.css';

const LearnerPage = ({ user, notifications, setNotifications, socket }) => {
  const [searchSubject, setSearchSubject] = useState('');
  const [tutors, setTutors] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false); // Track if search has been performed
  const [pendingReviews, setPendingReviews] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [currentReview, setCurrentReview] = useState(null);
  const [activeTab, setActiveTab] = useState('search'); // 'search' or 'sessions'
  const [mandatoryReview, setMandatoryReview] = useState(false);
  const [showAllReviewsModal, setShowAllReviewsModal] = useState(false);
  const [selectedTutorReviews, setSelectedTutorReviews] = useState([]);
  const [selectedTutorInfo, setSelectedTutorInfo] = useState(null);
  const [activeVideoCall, setActiveVideoCall] = useState(null); // { requestId, tutorId, tutorName }

  useEffect(() => {
    fetchPendingReviews();
    fetchSessions();
    // Reset search state when component mounts
    setHasSearched(false);
    setTutors([]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for session acceptance to start video call
  useEffect(() => {
    if (!socket) return;

    const handleSessionAccepted = async (data) => {
      console.log('🎉 LearnerPage: Received session:accepted event', data);
      console.log('📋 Session data:', {
        requestId: data.requestId,
        tutorId: data.tutorId,
        tutorName: data.tutorName
      });
      
      // Validate data
      if (!data.requestId || !data.tutorId) {
        console.error('❌ Invalid session:accepted data:', data);
        alert('Error: Invalid session data received');
        return;
      }
      
      // Immediately refresh sessions to show accepted status
      try {
        const response = await axios.get('/learner/sessions');
        setSessions(response.data);
        console.log('✅ LearnerPage: Sessions refreshed after acceptance');
      } catch (error) {
        console.error('Error refreshing sessions:', error);
      }
      
      // Start video call automatically
      const videoCallData = {
        requestId: data.requestId,
        tutorId: data.tutorId,
        tutorName: data.tutorName
      };
      
      console.log('📹 LearnerPage: Starting video call with data:', videoCallData);
      setActiveVideoCall(videoCallData);
    };

    socket.on('session:accepted', handleSessionAccepted);

    return () => {
      socket.off('session:accepted', handleSessionAccepted);
    };
  }, [socket]);

  const fetchPendingReviews = async () => {
    try {
      const response = await axios.get('/user/pending-reviews');
      setPendingReviews(response.data);
    } catch (error) {
      console.error('Error fetching pending reviews:', error);
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await axios.get('/learner/sessions');
      setSessions(response.data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const searchTutors = async (e) => {
    e.preventDefault();
    if (!searchSubject.trim()) {
      // If empty search, reset everything
      setTutors([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true); // Mark that search has been performed
    try {
      const response = await axios.get(`/tutors/search/${encodeURIComponent(searchSubject)}`);
      setTutors(response.data);
    } catch (error) {
      if (error.response?.status === 403 && error.response?.data?.requiresReview) {
        // Handle mandatory review requirement
        alert(`⚠️ ${error.response.data.message}\n\nYou have ${error.response.data.pendingReviews} pending review(s). Please complete them first!`);
        setActiveTab('sessions'); // Switch to sessions tab to show pending reviews
        await fetchPendingReviews(); // Refresh pending reviews
      } else {
        console.error('Error searching tutors:', error);
        alert(error.response?.data?.message || 'Error searching tutors');
      }
      setTutors([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const sendRequest = async (tutorId) => {
    try {
      await axios.post('/request', {
        tutorId,
        subject: searchSubject
      });
      alert('✅ Request sent successfully!');
      setTutors([]); // Clear results after sending request
      setSearchSubject(''); // Clear search
      setHasSearched(false); // Reset search state
      fetchSessions(); // Refresh sessions in case request gets accepted quickly
    } catch (error) {
      if (error.response?.status === 403 && error.response?.data?.requiresReview) {
        alert(`⚠️ ${error.response.data.message}\n\nPlease complete your pending reviews first!`);
        setActiveTab('sessions'); // Switch to sessions tab
        await fetchPendingReviews();
      } else {
        alert(error.response?.data?.message || 'Error sending request');
      }
    }
  };

  const fetchAllReviews = async (tutorId, tutorName) => {
    try {
      const response = await axios.get(`/tutors/${tutorId}/reviews`);
      setSelectedTutorReviews(response.data);
      setSelectedTutorInfo({ id: tutorId, name: tutorName });
      setShowAllReviewsModal(true);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      alert('Failed to load reviews. Please try again.');
    }
  };

  const openReviewModal = (session) => {
    setCurrentReview(session);
    setShowReviewModal(true);
  };

  const closeReviewModal = () => {
    setShowReviewModal(false);
    setCurrentReview(null);
    setMandatoryReview(false);
    fetchPendingReviews(); // Refresh pending reviews
  };

  const handleRefresh = async () => {
    console.log('LearnerPage: Refresh requested');
    try {
      // Refresh sessions data
      await fetchSessions();
      // Clear current search results and reset search state
      setTutors([]);
      setHasSearched(false);
      setSearchSubject('');
      console.log('LearnerPage: Refresh completed');
    } catch (error) {
      console.error('LearnerPage: Error during refresh:', error);
    }
  };

  const handleCallEnd = async () => {
    // Close video call
    setActiveVideoCall(null);
    
    // Note: Session completion is handled by tutor side
    // Just refresh to see updated status
    await fetchSessions();
  };

  const handleStartVideoCall = (session) => {
    console.log('🎬 Manual video call start requested for session:', session);
    
    // Show alert with session keys to help debug
    alert(`DEBUG: Session keys: ${Object.keys(session).join(', ')}\nSession.tutor: ${JSON.stringify(session.tutor)}`);
    
    try {
      console.log('📋 Full session object:', JSON.stringify(session, null, 2));
    } catch (e) {
      console.log('📋 Full session object (circular):', session);
    }
    
    // Validate session data
    if (!session) {
      alert('Error: Session is null or undefined');
      return;
    }
    
    console.log('📋 Session.tutor:', session.tutor);
    console.log('📋 Session.tutor type:', typeof session.tutor);
    
    // Try multiple ways to get the tutor ID
    let tutorId;
    
    if (session.tutor) {
      if (typeof session.tutor === 'object') {
        tutorId = session.tutor.id;
        console.log('📋 Extracted from session.tutor.id:', tutorId);
      } else {
        tutorId = session.tutor;
        console.log('📋 Extracted from session.tutor directly:', tutorId);
      }
    }
    
    // Fallback: check if there's a tutorId field directly on session
    if (!tutorId && tutorId !== 0) {
      console.log('⚠️ tutorId not found in session.tutor, checking session.tutorId...');
      tutorId = session.tutorId;
    }
    
    console.log('📋 Final tutorId:', tutorId, 'Type:', typeof tutorId);
    
    // Validate tutorId (allow 0 as valid ID)
    if (tutorId === undefined || tutorId === null || tutorId === '') {
      console.error('❌ Invalid tutor ID:', tutorId);
      console.error('❌ Full session for debugging:', session);
      alert('Error: Cannot start video call - tutor ID is missing. Check console for details.');
      return;
    }
    
    const videoCallData = {
      requestId: session.id,
      tutorId: Number(tutorId), // Ensure it's a number
      tutorName: (session.tutor && typeof session.tutor === 'object') ? session.tutor.name : 'Tutor'
    };
    
    console.log('📹 Setting video call with data:', videoCallData);
    setActiveVideoCall(videoCallData);
  };

  return (
    <div className="learner-container">;
      {/* Show video call if active */}
      {activeVideoCall && socket && (
        <>
          {console.log('🎥 LearnerPage: Rendering VideoCall with props:', {
            requestId: activeVideoCall.requestId,
            localUserId: user.id,
            remoteUserId: activeVideoCall.tutorId,
            isInitiator: false
          })}
          <VideoCall
            socket={socket}
            requestId={activeVideoCall.requestId}
            localUserId={user.id}
            remoteUserId={activeVideoCall.tutorId}
            isInitiator={false} // Learner receives the call
            onCallEnd={handleCallEnd}
          />
        </>
      )}

      <div className="learner-header">
        <h2>Find Your Perfect Tutor</h2>
        <NotificationBar 
          notifications={notifications} 
          setNotifications={setNotifications} 
          onRefresh={handleRefresh}
        />
      </div>

      {/* Pending Reviews Alert */}
      {pendingReviews.length > 0 && (
        <div className="pending-reviews-alert">
          <h3>🚨 Action Required: Pending Reviews</h3>
          <p>You have <strong>{pendingReviews.length}</strong> completed session(s) that need your review.</p>
          <p><strong>🔒 You must complete these reviews before searching for new tutors.</strong></p>
          <p>Help other learners by sharing your experience!</p>
          <div className="pending-sessions">
            {pendingReviews.map((session) => (
              <div key={session.id} className="pending-session">
                <div className="session-details">
                  <strong>📚 Subject:</strong> {session.subject} | 
                  <strong> 👨‍🏫 Tutor:</strong> {session.tutor.name} |
                  <strong> 📅 Date:</strong> {new Date(session.createdAt).toLocaleDateString()}
                </div>
                <button 
                  onClick={() => openReviewModal(session)}
                  className="review-btn urgent"
                >
                  ⭐ Write Review Now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tabs-navigation">
        <button 
          className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('search');
            // Don't reset search when switching back to search tab
          }}
        >
          🔍 Search Tutors
        </button>
        <button 
          className={`tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('sessions');
            setTutors([]); // Clear search results when switching to sessions
            setHasSearched(false); // Reset search state
          }}
        >
          📚 My Sessions ({sessions.length})
          {sessions.filter(s => s.status === 'completed' || s.status === 'reviewed').length > 0 && (
            <span className="review-indicator"> ⭐</span>
          )}
        </button>
      </div>

      {/* Search Section */}
      {activeTab === 'search' && (
        <div>
          <div className="search-section">
            <form onSubmit={searchTutors} className="search-form">
              <input
                type="text"
                value={searchSubject}
                onChange={(e) => {
                  setSearchSubject(e.target.value);
                  // If user clears the search field, reset search state
                  if (e.target.value.trim() === '') {
                    setTutors([]);
                    setHasSearched(false);
                  }
                }}
                placeholder="Search for subject experts (e.g., Mathematics, Physics, Programming)"
                disabled={pendingReviews.length > 0}
              />
              <button 
                type="submit" 
                disabled={loading || pendingReviews.length > 0}
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </form>
          </div>

          {/* Results Section */}
          {tutors.length > 0 && (
            <div className="results-section">
              <h3>Available Online Tutors for "{searchSubject}"</h3>
              <div className="tutors-grid">
                {tutors.map((tutor, index) => (
                  <div key={tutor.id} className="tutor-card">
                    <div className="tutor-info">
                      <h4>{tutor.name}</h4>
                      <div className="tutor-rating">
                        <div className="stars">
                          {'⭐'.repeat(Math.round(tutor.rating || 0))}
                          <span className="rating-number">({tutor.rating?.toFixed(1) || '0.0'})</span>
                        </div>
                        <small className="review-count">({tutor.reviewCount || 0} reviews)</small>
                      </div>
                      <div className="tutor-subjects">
                        <strong>Subjects:</strong>
                        <div className="subjects-list">
                          {tutor.subjects.map((subject, index) => (
                            <span key={index} className="subject-tag">{subject}</span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="online-status">
                        🟢 Online Now
                      </div>
                    </div>
                    <div className="tutor-actions">
                      <button
                        onClick={() => sendRequest(tutor.id)}
                        className="request-btn"
                      >
                        Send Request
                      </button>
                      {tutor.reviewCount > 0 && (
                        <button
                          onClick={() => fetchAllReviews(tutor.id, tutor.name)}
                          className="reviews-btn"
                        >
                          📝 See All Reviews ({tutor.reviewCount})
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}


        </div>
      )}

      {/* Sessions Section */}
      {activeTab === 'sessions' && (
        <div className="sessions-section">
          {sessions.length === 0 ? (
            <div className="no-sessions">
              <h3>No Sessions Yet</h3>
              <p>Once tutors accept your requests, your scheduled sessions will appear here.</p>
              <button 
                onClick={() => setActiveTab('search')}
                className="search-tutors-btn"
              >
                Search for Tutors
              </button>
            </div>
          ) : (
            <div className="sessions-list">
              <h3>Your Learning Sessions</h3>
              {sessions.map((session) => (
                <div key={session.id} className={`session-card ${(session.status === 'completed' || session.status === 'reviewed') ? 'completed-session' : ''}`}>
                  <div className="session-info">
                    <h4>{session.tutor.name}</h4>
                    <p><strong>Subject:</strong> {session.subject}</p>
                    <p><strong>Tutor Email:</strong> {session.tutor.email}</p>
                    <p><strong>Scheduled:</strong> {
                      session.sessionDate && session.status !== 'pending' 
                        ? new Date(session.sessionDate).toLocaleString()
                        : 'Not yet scheduled'
                    }</p>
                    <p><strong>Status:</strong> 
                      {session.status === 'completed' || session.status === 'reviewed' ? (
                        <span className="status-completed">✅ Completed by Tutor</span>
                      ) : session.status === 'accepted' ? (
                        <span className="status-accepted">📚 Confirmed</span>
                      ) : session.status === 'pending' ? (
                        <span className="status-pending">⏳ Waiting for Tutor Response</span>
                      ) : (
                        <span className="status-unknown">❓ {session.status}</span>
                      )}
                    </p>
                    {(session.status === 'completed' || session.status === 'reviewed') && (
                      <div className="completion-notice">
                        {session.status === 'completed' ? (
                          <>
                            <p><strong>🎉 Session Completed!</strong></p>
                            <p>Your tutor has marked this session as complete. Please leave a review to help other learners.</p>
                          </>
                        ) : (
                          <>
                            <p><strong>🎉 Session Completed!</strong></p>
                            <p>✅ Review submitted! Thank you for your feedback.</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="session-actions">
                    {session.status === 'completed' ? (
                      <button
                        onClick={() => openReviewModal(session)}
                        className="review-btn primary"
                      >
                        ⭐ Write Review
                      </button>
                    ) : session.status === 'reviewed' ? (
                      <button
                        className="review-btn completed"
                        disabled
                      >
                        ✅ Review Submitted
                      </button>
                    ) : session.status === 'accepted' ? (
                      <div className="accepted-session-info">
                        <div className="acceptance-notice">
                          <p className="accepted-text">✅ <strong>Accepted by tutor</strong></p>
                        </div>
                        <button
                          onClick={() => handleStartVideoCall(session)}
                          className="video-call-btn"
                        >
                          📹 Join Video Call
                        </button>
                      </div>
                    ) : session.status === 'pending' ? (
                      <div className="pending-session-info">
                        <div className="pending-notice">
                          <p className="pending-text">⏳ <strong>Waiting for tutor response...</strong></p>
                          <p className="pending-description">Your request has been sent. The tutor will respond soon.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="unknown-status-info">
                        <p>Status: {session.status}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Show helpful message when user has typed but not searched yet */}
      {!hasSearched && searchSubject.trim() && !loading && (
        <div className="search-prompt">
          <p>👆 Click on the search button to scan for tutors teaching "{searchSubject}"</p>
        </div>
      )}

      {/* Show "no results" only after search has been performed */}
      {hasSearched && tutors.length === 0 && !loading && (
        <div className="no-results">
          <p>No online tutors found for "{searchSubject}"</p>
          <p>Try searching for a different subject or check back later.</p>
        </div>
      )}

      {/* All Reviews Modal */}
      {showAllReviewsModal && (
        <div className="modal-overlay" onClick={() => setShowAllReviewsModal(false)}>
          <div className="modal-content all-reviews-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>All Reviews for {selectedTutorInfo?.name}</h3>
              <button 
                className="close-btn" 
                onClick={() => setShowAllReviewsModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              {selectedTutorReviews.length === 0 ? (
                <p>No reviews available for this tutor yet.</p>
              ) : (
                <div className="all-reviews-list">
                  {selectedTutorReviews.map((review, index) => (
                    <div key={index} className="full-review-item">
                      <div className="review-header">
                        <div className="review-rating">
                          {'⭐'.repeat(review.rating)}
                          <span className="rating-number">({review.rating}/5)</span>
                        </div>
                        <div className="review-meta">
                          <span className="reviewer">by {review.learner.name}</span>
                          <span className="review-date">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {review.comment && (
                        <div className="review-comment">
                          <p>"{review.comment}"</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* All Reviews Modal */}
      {showAllReviewsModal && (
        <div className="modal-overlay">
          <div className="modal-content all-reviews-modal">
            <div className="modal-header">
              <h3>All Reviews for {selectedTutorInfo?.name}</h3>
              <button 
                className="close-btn"
                onClick={() => setShowAllReviewsModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              {selectedTutorReviews.length === 0 ? (
                <p>No reviews yet for this tutor.</p>
              ) : (
                <div className="all-reviews-list">
                  {selectedTutorReviews.map((review, index) => (
                    <div key={index} className="full-review-item">
                      <div className="review-header">
                        <div className="review-rating">
                          {'⭐'.repeat(review.rating)}
                          <span className="rating-number">({review.rating}/5)</span>
                        </div>
                        <div className="review-meta">
                          <div className="reviewer">by {review.learner.name}</div>
                          <div className="review-date">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      {review.comment && (
                        <div className="review-comment">
                          <p>"{review.comment}"</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <ReviewModal
          session={currentReview}
          onClose={closeReviewModal}
          mandatory={mandatoryReview}
        />
      )}
    </div>
  );
};

export default LearnerPage;