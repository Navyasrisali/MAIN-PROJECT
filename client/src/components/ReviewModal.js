import React, { useState } from 'react';
import axios from 'axios';
import './ReviewModal.css';

const ReviewModal = ({ session, onClose, mandatory = false }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/review', {
        requestId: session.id,
        rating,
        comment
      });
      
      alert(`✅ ${response.data.message || 'Review submitted successfully!'}\n\n⭐ You gave ${rating} stars\n${response.data.tutorNewRating ? `🎯 Tutor's new rating: ${response.data.tutorNewRating}/5` : ''}`);
      onClose();
    } catch (error) {
      alert(`❌ Error submitting review: ${error.response?.data?.message || 'Please try again'}`);
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Review Your Session</h3>
          {!mandatory && (
            <button onClick={onClose} className="close-btn">×</button>
          )}
        </div>
        
        <div className="session-details">
          <p><strong>Tutor:</strong> {session.tutor.name}</p>
          <p><strong>Subject:</strong> {session.subject}</p>
          <p><strong>Date:</strong> {new Date(session.createdAt).toLocaleDateString()}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="rating-section">
            <label>Rating:</label>
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`star ${rating >= star ? 'filled' : ''}`}
                >
                  ⭐
                </button>
              ))}
            </div>
          </div>

          <div className="comment-section">
            <label>Comment (optional):</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience with this tutor..."
              rows="4"
            />
          </div>

          <div className="modal-actions">
            {!mandatory && (
              <button type="button" onClick={onClose} className="cancel-btn">
                Cancel
              </button>
            )}
            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewModal;