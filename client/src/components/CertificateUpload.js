import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CertificateUpload.css';

const FALLBACK_BACKEND_URL = 'https://mern-learning-backend.onrender.com';
const API_BASE_URL =
  process.env.REACT_APP_API_URL &&
  !process.env.REACT_APP_API_URL.includes('your-render-backend-url.onrender.com')
    ? process.env.REACT_APP_API_URL
    : FALLBACK_BACKEND_URL;

const getNormalizedStatus = (user) => {
  const rawStatus = user.verificationStatus || 'pending';
  const hasUploadedCertificate = Boolean(user.certificateUrl);

  if (!hasUploadedCertificate && rawStatus !== 'approved') {
    return 'not_submitted';
  }

  return rawStatus;
};

const CertificateUpload = ({ user, updateUser }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(getNormalizedStatus(user));
  const [certificateUrl, setCertificateUrl] = useState(user.certificateUrl || null);
  const [rejectionReason, setRejectionReason] = useState(user.certificateRejectionReason || null);

  useEffect(() => {
    setVerificationStatus(getNormalizedStatus(user));
    setCertificateUrl(user.certificateUrl || null);
    setRejectionReason(user.certificateRejectionReason || null);
  }, [user]);

  const handleFileSelect = (e) => {
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

      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    setUploading(true);
    try {
      // Keep backend role in sync before certificate upload.
      const roleSyncResponse = await axios.put(`${API_BASE_URL}/api/user/role`, {
        role: 'tutor',
        subjects: user.subjects || []
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const formData = new FormData();
      formData.append('certificate', selectedFile);

      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/api/upload-certificate`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`
          // Let axios set Content-Type with proper boundary for multipart
        }
      });

      alert(response.data.message);
      setVerificationStatus(response.data.verificationStatus);
      setCertificateUrl(response.data.certificateUrl);
      setSelectedFile(null);
      
      // Update user state
      if (updateUser) {
        updateUser({
          ...user,
          role: roleSyncResponse?.data?.user?.role || 'tutor',
          verificationStatus: response.data.verificationStatus,
          certificateUrl: response.data.certificateUrl
        });
      }
    } catch (error) {
      console.error('Error uploading certificate:', error);
      alert(error.response?.data?.message || 'Failed to upload certificate');
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = () => {
    switch (verificationStatus) {
      case 'not_submitted':
        return <span className="status-badge pending">📝 Not Submitted</span>;
      case 'pending':
        return <span className="status-badge pending">⏳ Pending Verification</span>;
      case 'approved':
        return <span className="status-badge approved">✅ Verified</span>;
      case 'rejected':
        return <span className="status-badge rejected">❌ Rejected</span>;
      default:
        return <span className="status-badge pending">⏳ Not Submitted</span>;
    }
  };

  return (
    <div className="certificate-upload-section">
      <div className="certificate-header">
        <h3>Certificate Verification</h3>
        {getStatusBadge()}
      </div>

      {!user.isVerified && (
        <div className="verification-info">
          <p>
            <strong>⚠️ Important:</strong> You must upload and get your certificate verified before you can start teaching. 
            Only verified tutors will appear in learner searches.
          </p>
        </div>
      )}

      {verificationStatus === 'rejected' && rejectionReason && (
        <div className="rejection-notice">
          <h4>Rejection Reason:</h4>
          <p>{rejectionReason}</p>
          <p className="reupload-text">Please upload a valid certificate to continue.</p>
        </div>
      )}

      {verificationStatus === 'pending' && certificateUrl && (
        <div className="pending-notice">
          <p>✓ Certificate uploaded successfully! Awaiting admin verification.</p>
          <a 
            href={`${API_BASE_URL}${certificateUrl}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="view-certificate-link"
          >
            View Uploaded Certificate
          </a>
        </div>
      )}

      {verificationStatus === 'approved' && (
        <div className="approved-notice">
          <p>🎉 Congratulations! Your certificate has been verified. You can now start teaching!</p>
          {certificateUrl && (
            <a 
              href={`${API_BASE_URL}${certificateUrl}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="view-certificate-link"
            >
              View Your Certificate
            </a>
          )}
        </div>
      )}

      {(verificationStatus === 'not_submitted' || verificationStatus === 'rejected') && (
        <div className="upload-form">
          <div className="file-input-wrapper">
            <label htmlFor="certificate-file" className="file-label">
              {selectedFile ? (
                <>
                  <span className="file-icon">📄</span>
                  <span className="file-name">{selectedFile.name}</span>
                  <span className="file-size">({(selectedFile.size / 1024).toFixed(2)} KB)</span>
                </>
              ) : (
                <>
                  <span className="upload-icon">📤</span>
                  <span>Choose Certificate File</span>
                  <span className="file-hint">(PDF, JPEG, or PNG - Max 5MB)</span>
                </>
              )}
            </label>
            <input
              type="file"
              id="certificate-file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="file-input"
            />
          </div>

          {selectedFile && (
            <button 
              onClick={handleUpload} 
              disabled={uploading}
              className="upload-btn"
            >
              {uploading ? 'Uploading...' : 'Upload Certificate'}
            </button>
          )}
        </div>
      )}

      {verificationStatus === 'pending' && (
        <div className="reupload-section">
          <p>Need to upload a different certificate?</p>
          <button 
            onClick={() => {
              setCertificateUrl(null);
              setSelectedFile(null);
              setVerificationStatus('not_submitted');
            }}
            className="reupload-btn"
          >
            Upload New Certificate
          </button>
        </div>
      )}
    </div>
  );
};

export default CertificateUpload;
