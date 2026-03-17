import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminDashboard.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AdminDashboard = () => {
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [allTutors, setAllTutors] = useState([]);
  const [selectedTab, setSelectedTab] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedTutorForRejection, setSelectedTutorForRejection] = useState(null);

  useEffect(() => {
    fetchData();
  }, [selectedTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      if (selectedTab === 'pending') {
        const response = await axios.get(`${API_BASE_URL}/api/admin/verifications/pending`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPendingVerifications(response.data);
      } else if (selectedTab === 'all') {
        const response = await axios.get(`${API_BASE_URL}/api/admin/tutors`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAllTutors(response.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      alert(error.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (tutorId) => {
    if (!window.confirm('Are you sure you want to approve this tutor?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/api/admin/tutors/${tutorId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Tutor approved successfully!');
      fetchData();
    } catch (error) {
      console.error('Error approving tutor:', error);
      alert(error.response?.data?.message || 'Failed to approve tutor');
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/api/admin/tutors/${selectedTutorForRejection}/reject`, 
        { reason: rejectionReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Tutor rejected successfully!');
      setSelectedTutorForRejection(null);
      setRejectionReason('');
      fetchData();
    } catch (error) {
      console.error('Error rejecting tutor:', error);
      alert(error.response?.data?.message || 'Failed to reject tutor');
    }
  };

  const viewCertificate = (certificateUrl) => {
    setSelectedCertificate(certificateUrl);
  };

  const renderPendingVerifications = () => (
    <div className="verification-list">
      <h2>Pending Certificate Verifications</h2>
      {pendingVerifications.length === 0 ? (
        <p className="no-data">No pending verifications</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Tutor Name</th>
              <th>Email</th>
              <th>Subjects</th>
              <th>Certificate</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingVerifications.map(tutor => (
              <tr key={tutor.id}>
                <td>{tutor.name}</td>
                <td>{tutor.email}</td>
                <td>{tutor.subjects?.join(', ') || 'None'}</td>
                <td>
                  <button 
                    className="btn-view"
                    onClick={() => viewCertificate(`${API_BASE_URL}${tutor.certificateUrl}`)}
                  >
                    View Certificate
                  </button>
                </td>
                <td>
                  <button 
                    className="btn-approve"
                    onClick={() => handleApprove(tutor.id)}
                  >
                    Approve
                  </button>
                  <button 
                    className="btn-reject"
                    onClick={() => setSelectedTutorForRejection(tutor.id)}
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderAllTutors = () => (
    <div className="verification-list">
      <h2>All Tutors</h2>
      {allTutors.length === 0 ? (
        <p className="no-data">No tutors registered</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Subjects</th>
              <th>Status</th>
              <th>Rating</th>
              <th>Reviews</th>
              <th>Certificate</th>
            </tr>
          </thead>
          <tbody>
            {allTutors.map(tutor => (
              <tr key={tutor.id}>
                <td>{tutor.name}</td>
                <td>{tutor.email}</td>
                <td>{tutor.subjects?.join(', ') || 'None'}</td>
                <td>
                  <span className={`status-badge status-${tutor.verificationStatus}`}>
                    {tutor.verificationStatus}
                  </span>
                </td>
                <td>{tutor.rating?.toFixed(1) || '0.0'}</td>
                <td>{tutor.reviewCount || 0}</td>
                <td>
                  {tutor.certificateUrl && (
                    <button 
                      className="btn-view"
                      onClick={() => viewCertificate(`${API_BASE_URL}${tutor.certificateUrl}`)}
                    >
                      View
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );



  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <p>Manage tutor certificate verifications</p>
      </div>

      <div className="admin-tabs">
        <button 
          className={selectedTab === 'pending' ? 'active' : ''}
          onClick={() => setSelectedTab('pending')}
        >
          Pending Verifications
        </button>
        <button 
          className={selectedTab === 'all' ? 'active' : ''}
          onClick={() => setSelectedTab('all')}
        >
          All Tutors
        </button>
      </div>

      <div className="admin-content">
        {loading ? (
          <p className="loading">Loading...</p>
        ) : (
          <>
            {selectedTab === 'pending' && renderPendingVerifications()}
            {selectedTab === 'all' && renderAllTutors()}
          </>
        )}
      </div>

      {/* Certificate Modal */}
      {selectedCertificate && (
        <div className="modal-overlay" onClick={() => setSelectedCertificate(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedCertificate(null)}>×</button>
            <h3>Certificate Preview</h3>
            {selectedCertificate.endsWith('.pdf') ? (
              <iframe 
                src={selectedCertificate} 
                title="Certificate"
                className="certificate-iframe"
              />
            ) : (
              <img 
                src={selectedCertificate} 
                alt="Certificate" 
                className="certificate-image"
              />
            )}
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {selectedTutorForRejection && (
        <div className="modal-overlay" onClick={() => setSelectedTutorForRejection(null)}>
          <div className="modal-content rejection-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedTutorForRejection(null)}>×</button>
            <h3>Reject Certificate</h3>
            <p>Please provide a reason for rejection:</p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter reason for rejection..."
              rows="4"
              className="rejection-textarea"
            />
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setSelectedTutorForRejection(null)}>
                Cancel
              </button>
              <button className="btn-submit" onClick={handleReject}>
                Submit Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
