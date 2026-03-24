import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CertificateUpload.css';

const FALLBACK_BACKEND_URL = 'http://localhost:5000';
const API_BASE_URL =
  process.env.REACT_APP_API_URL &&
  !process.env.REACT_APP_API_URL.includes('your-render-backend-url.onrender.com')
    ? process.env.REACT_APP_API_URL
    : FALLBACK_BACKEND_URL;

const formatStatus = (status) => {
  if (status === 'approved') return '✅ Verified';
  if (status === 'pending') return '⏳ Pending Verification';
  if (status === 'rejected') return '❌ Rejected';
  return '📝 Not Submitted';
};

const CertificateUpload = ({ user, updateUser }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(user.verificationStatus || 'not_submitted');
  const [certificateUrls, setCertificateUrls] = useState(user.certificateUrls || []);

  useEffect(() => {
    setVerificationStatus(user.verificationStatus || 'not_submitted');
    setCertificateUrls(user.certificateUrls || []);
  }, [user]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const allowedTypes = ['application/pdf'];
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        alert('Please select only PDF files');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert(`File size must be less than 5MB: ${file.name}`);
        return;
      }
    }

    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (!selectedFiles.length) {
      alert('Please select one or more PDF certificates first');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('certificates', file);
      });

      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/api/upload-certificate`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      alert(response.data.message);
      setSelectedFiles([]);
      setVerificationStatus(response.data.verificationStatus || 'pending');
      setCertificateUrls(response.data.certificateUrls || []);

      if (updateUser) {
        updateUser({
          ...user,
          verificationStatus: response.data.verificationStatus,
          isVerified: response.data.isVerified,
          certificateUrls: response.data.certificateUrls || user.certificateUrls || []
        });
      }
    } catch (error) {
      console.error('Error uploading certificate:', error);
      alert(error.response?.data?.message || 'Failed to upload certificate');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="certificate-upload-section">
      <div className="certificate-header">
        <h3>Certificate Verification</h3>
        <span className={`status-badge ${verificationStatus}`}>
          {formatStatus(verificationStatus)}
        </span>
      </div>

      <div className="verification-info">
        <p>
          <strong>⚠️ Important:</strong> Select multiple PDF certificates and upload them together.
        </p>
      </div>

      {certificateUrls.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <strong>Uploaded Certificates:</strong>
          <ul style={{ marginTop: '8px' }}>
            {certificateUrls.map((url, index) => (
              <li key={`${url}-${index}`}>
                <a href={`${API_BASE_URL}${url}`} target="_blank" rel="noopener noreferrer" className="view-certificate-link">
                  View Certificate {index + 1}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="upload-form" style={{ marginBottom: '16px' }}>
        <div className="file-input-wrapper">
          <label htmlFor="certificate-files" className="file-label">
            {selectedFiles.length ? (
              <>
                <span className="file-icon">📄</span>
                <span className="file-name">{selectedFiles.length} PDF file(s) selected</span>
              </>
            ) : (
              <>
                <span className="upload-icon">📤</span>
                <span>Choose certificate PDFs</span>
                <span className="file-hint">(Multiple PDF files allowed, max 5MB each)</span>
              </>
            )}
          </label>
          <input
            type="file"
            id="certificate-files"
            accept=".pdf,application/pdf"
            multiple
            onChange={handleFileSelect}
            className="file-input"
          />
        </div>

        <button
          onClick={handleUpload}
          disabled={uploading || !selectedFiles.length}
          className="upload-btn"
          style={{ marginTop: '8px', opacity: selectedFiles.length ? 1 : 0.6 }}
        >
          {uploading ? 'Uploading...' : 'Upload Certificates'}
        </button>
      </div>
    </div>
  );
};

export default CertificateUpload;
