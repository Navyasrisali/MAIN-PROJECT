import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CertificateUpload.css';

const FALLBACK_BACKEND_URL = 'https://mern-learning-backend.onrender.com';
const API_BASE_URL =
  process.env.REACT_APP_API_URL &&
  !process.env.REACT_APP_API_URL.includes('your-render-backend-url.onrender.com')
    ? process.env.REACT_APP_API_URL
    : FALLBACK_BACKEND_URL;

const normalizeSubjectKey = (subject) => String(subject || '').trim().toLowerCase();

const formatStatus = (status) => {
  if (status === 'approved') return '✅ Verified';
  if (status === 'pending') return '⏳ Pending Verification';
  if (status === 'rejected') return '❌ Rejected';
  return '📝 Not Submitted';
};

const CertificateUpload = ({ user, updateUser }) => {
  const [selectedFiles, setSelectedFiles] = useState({});
  const [uploading, setUploading] = useState(false);
  const [subjectVerifications, setSubjectVerifications] = useState(user.subjectVerifications || {});

  useEffect(() => {
    setSubjectVerifications(user.subjectVerifications || {});
  }, [user]);

  const handleFileSelect = (subject, e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please select a valid file (JPEG, PNG, or PDF)');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      setSelectedFiles((prev) => ({ ...prev, [subject]: file }));
    }
  };

  const handleUpload = async (subject) => {
    const selectedFile = selectedFiles[subject];

    if (!selectedFile) {
      alert(`Please select a certificate file for ${subject}`);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('certificate', selectedFile);
      formData.append('subject', subject);

      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/api/upload-certificate`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`
          // Let axios set Content-Type with proper boundary for multipart
        }
      });

      alert(response.data.message);
      setSelectedFiles((prev) => ({ ...prev, [subject]: null }));
      setSubjectVerifications(response.data.subjectVerifications || {});

      // Immediately update parent from upload response so UI reflects success even if profile sync fails.
      if (updateUser) {
        updateUser((prevUser) => ({
          ...prevUser,
          verificationStatus: response.data.verificationStatus,
          subjectVerifications: response.data.subjectVerifications || prevUser.subjectVerifications || {}
        }));
      }

      // Re-sync from server to avoid any stale local state after upload.
      try {
        const profileResponse = await axios.get(`${API_BASE_URL}/api/user/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const freshUser = profileResponse?.data?.user;

        if (updateUser && freshUser) {
          updateUser(freshUser);
        }
      } catch (syncError) {
        console.warn('Profile re-sync skipped after upload:', syncError?.response?.data || syncError.message);
      }
    } catch (error) {
      console.error('Error uploading certificate:', error);
      alert(error.response?.data?.message || 'Failed to upload certificate');
    } finally {
      setUploading(false);
    }
  };

  const tutorSubjects = user.subjects || [];

  const getSubjectVerification = (subject) => {
    const key = normalizeSubjectKey(subject);
    return subjectVerifications[key] || {
      subject,
      status: 'not_submitted',
      certificateUrl: null,
      rejectionReason: null
    };
  };

  return (
    <div className="certificate-upload-section">
      <div className="certificate-header">
        <h3>Subject-wise Certificate Verification</h3>
      </div>

      {!tutorSubjects.length && (
        <div className="verification-info">
          <p><strong>ℹ️ Add subjects first.</strong> Then upload one certificate for each subject.</p>
        </div>
      )}

      {!!tutorSubjects.length && (
        <div className="verification-info">
          <p>
            <strong>⚠️ Important:</strong> Each subject needs its own approved certificate.
            Learners can find you only for subjects with approved verification.
          </p>
        </div>
      )}

      {tutorSubjects.map((subject) => {
        const verification = getSubjectVerification(subject);
        const selectedFile = selectedFiles[subject];

        return (
          <div key={subject} className="upload-form" style={{ marginBottom: '16px' }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>{subject}</strong>{' '}
              <span className={`status-badge ${verification.status || 'pending'}`}>
                {formatStatus(verification.status)}
              </span>
            </div>

            {verification.rejectionReason && (
              <div className="rejection-notice" style={{ marginBottom: '8px' }}>
                <h4>Rejection Reason:</h4>
                <p>{verification.rejectionReason}</p>
              </div>
            )}

            {verification.certificateUrl && (
              <div style={{ marginBottom: '8px' }}>
                <a
                  href={`${API_BASE_URL}${verification.certificateUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="view-certificate-link"
                >
                  View Uploaded Certificate
                </a>
              </div>
            )}

            <div className="file-input-wrapper">
              <label htmlFor={`certificate-file-${subject}`} className="file-label">
                {selectedFile ? (
                  <>
                    <span className="file-icon">📄</span>
                    <span className="file-name">{selectedFile.name}</span>
                    <span className="file-size">({(selectedFile.size / 1024).toFixed(2)} KB)</span>
                  </>
                ) : (
                  <>
                    <span className="upload-icon">📤</span>
                    <span>Choose certificate for {subject}</span>
                    <span className="file-hint">(PDF, JPEG, or PNG - Max 5MB)</span>
                  </>
                )}
              </label>
              <input
                type="file"
                id={`certificate-file-${subject}`}
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileSelect(subject, e)}
                className="file-input"
              />
            </div>

            {selectedFile && (
              <button
                onClick={() => handleUpload(subject)}
                disabled={uploading}
                className="upload-btn"
                style={{ marginTop: '8px' }}
              >
                {uploading ? 'Uploading...' : `Upload ${subject} Certificate`}
              </button>
            )}

            {!selectedFile && (
              <button
                disabled
                className="upload-btn"
                style={{ marginTop: '8px', opacity: 0.6, cursor: 'not-allowed' }}
              >
                Select file to upload {subject} certificate
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CertificateUpload;
