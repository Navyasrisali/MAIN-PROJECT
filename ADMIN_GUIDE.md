# Admin + Certificate Verification System - User Guide

## Overview
The platform now includes an admin role that manages tutor certificate verification. Only verified tutors can appear in learner searches and accept teaching requests.

## Features Implemented

### 1. **Admin Role & Dashboard**
- Admins have access to a special dashboard at `/admin` route
- Dashboard includes three main tabs:
  - **Pending Verifications**: Review tutors awaiting certificate approval
  - **All Tutors**: View all registered tutors with their verification status
  - **Statistics**: Platform metrics (users, sessions, reviews, etc.)

### 2. **Certificate Upload for Tutors**
- Tutors must upload a certificate (PDF, JPEG, or PNG, max 5MB)
- Certificate is submitted for admin review
- Status tracking: pending, approved, or rejected
- If rejected, admin provides a reason and tutor can re-upload

### 3. **Verification Workflow**
```
Tutor Registers → Uploads Certificate → Admin Reviews → Approve/Reject
                                              ↓
                                         If Approved:
                                    Tutor appears in searches
                                    Can accept requests
                                              ↓
                                         If Rejected:
                                    Tutor notified with reason
                                    Can upload new certificate
```

### 4. **Search Restrictions**
- Only **verified tutors** (isVerified = true) appear in learner search results
- Unverified tutors remain hidden until admin approval

## How to Use

### For Tutors:
1. **Register/Login** as a tutor
2. **Upload Certificate**:
   - Go to Tutor Dashboard
   - Find "Certificate Verification" section at top
   - Click "Choose Certificate File"
   - Select your certificate (PDF, JPEG, or PNG)
   - Click "Upload Certificate"
3. **Wait for Admin Verification**
   - Status will show "⏳ Pending Verification"
   - You'll receive a notification when admin reviews
4. **If Approved**:
   - Status changes to "✅ Verified"
   - You can now go online and accept requests
   - Learners can find you in searches
5. **If Rejected**:
   - Status shows "❌ Rejected"
   - Read the rejection reason
   - Upload a new, valid certificate

### For Admins:
1. **Access Admin Dashboard**:
   - Login with admin credentials
   - Click "🔐 Admin Dashboard" button on main dashboard
   - Or navigate to `/admin` route

2. **Review Pending Certificates**:
   - Go to "Pending Verifications" tab
   - See list of tutors awaiting review
   - Click "View Certificate" to preview the uploaded file
   - Certificate opens in modal (PDF iframe or image viewer)

3. **Approve Certificate**:
   - Click "Approve" button
   - Tutor is immediately verified
   - Tutor receives notification of approval
   - Tutor now appears in learner searches

4. **Reject Certificate**:
   - Click "Reject" button
   - Enter reason for rejection in the modal
   - Submit rejection
   - Tutor receives notification with reason
   - Tutor can upload a new certificate

5. **View All Tutors**:
   - Switch to "All Tutors" tab
   - See complete list with verification status
   - Filter by status: pending, approved, rejected
   - View tutor ratings and review counts

6. **Check Statistics**:
   - Switch to "Statistics" tab
   - View platform metrics:
     - Total Users
     - Total Tutors
     - Verified Tutors
     - Pending Verifications
     - Total Learners
     - Total Sessions
     - Completed Sessions
     - Total Reviews

### For Learners:
- **No Changes Required**!
- Search for tutors as usual
- Only verified tutors will appear in search results
- No need to worry about unverified tutors

## API Endpoints

### Tutor Certificate Management
- **POST** `/api/upload-certificate` - Upload certificate (requires auth)
  - Body: FormData with 'certificate' file
  - Returns: certificateUrl, verificationStatus

### Admin Routes (require admin role)
- **GET** `/api/admin/verifications/pending` - Get pending verifications
- **GET** `/api/admin/tutors` - Get all tutors
- **PUT** `/api/admin/tutors/:tutorId/approve` - Approve certificate
- **PUT** `/api/admin/tutors/:tutorId/reject` - Reject certificate
  - Body: { reason: string }
- **GET** `/api/admin/statistics` - Get platform statistics
- **GET** `/api/admin/users` - Get all users

## Database Schema Changes

### User Model (Enhanced)
```javascript
{
  id: number,
  name: string,
  email: string,
  password: string (hashed),
  role: 'learner' | 'tutor' | 'admin',
  subjects: string[],
  isOnline: boolean,
  rating: number,
  reviewCount: number,
  
  // NEW FIELDS:
  isVerified: boolean,              // true if certificate approved
  verificationStatus: string,       // 'pending' | 'approved' | 'rejected'
  certificateUrl: string | null,    // path to uploaded certificate
  certificateRejectionReason: string | null  // reason if rejected
}
```

## File Structure

### Backend:
```
server/
├── uploads/certificates/      # Uploaded certificates
├── src/
│   ├── config/
│   │   └── multer.js          # File upload configuration
│   ├── controllers/
│   │   ├── authController.js  # Added uploadCertificate method
│   │   └── adminController.js # Admin operations
│   ├── middleware/
│   │   └── adminAuth.js       # Admin-only route protection
│   ├── routes/
│   │   ├── auth.js            # Added certificate upload route
│   │   ├── admin.js           # Admin routes
│   │   └── index.js           # Registered admin routes
│   └── models/
│       └── index.js           # Enhanced User model
```

### Frontend:
```
client/src/components/
├── AdminDashboard.js          # Admin dashboard component
├── AdminDashboard.css         # Admin dashboard styles
├── CertificateUpload.js       # Certificate upload component for tutors
├── CertificateUpload.css      # Certificate upload styles
├── TutorPage.js               # Modified to include CertificateUpload
├── Dashboard.js               # Modified to show admin button
└── App.js                     # Added /admin route
```

## Creating an Admin User

To create an admin user for testing:

1. **Register a normal user**
2. **Manually edit database.json**:
   ```json
   {
     "users": [
       {
         "id": 1,
         "email": "admin@example.com",
         "name": "Admin User",
         "role": "admin",  ← Change this to "admin"
         ...
       }
     ]
   }
   ```
3. **Restart the server** to load changes
4. **Login with admin credentials**

## Notifications

The system sends real-time notifications via Socket.io:

### Tutors receive:
- ✅ Certificate approved notification
- ❌ Certificate rejected notification (with reason)

### Admins receive:
- 📄 New certificate uploaded notification

## Security Features

1. **File Upload Validation**:
   - Only images (JPEG, PNG) and PDF files allowed
   - Maximum file size: 5MB
   - Files stored with unique names (timestamp + random number)

2. **Admin-Only Routes**:
   - All admin routes protected by `adminMiddleware`
   - Checks if `user.role === 'admin'`
   - Returns 403 Forbidden if not admin

3. **Search Filtering**:
   - Tutor search only returns `isVerified === true`
   - Prevents unverified tutors from being discovered

## Troubleshooting

### Tutor Issues:
- **"Upload failed"**: Check file size (max 5MB) and type (PDF, JPEG, PNG only)
- **"Not appearing in searches"**: Ensure certificate is approved by admin
- **"Cannot go online"**: Upload and verify certificate first

### Admin Issues:
- **"Cannot access admin dashboard"**: Verify role is set to 'admin' in database
- **"Certificate not loading"**: Check uploads/certificates/ folder exists
- **"Notifications not working"**: Verify Socket.io connection is active

### General Issues:
- **Server Error 500**: Check server logs for details
- **File not found**: Ensure uploads directory has proper permissions
- **Database not saving**: Check database.json file permissions

## Next Steps

Consider these enhancements for future development:

1. **Bulk Operations**: Approve/reject multiple certificates at once
2. **Certificate Expiry**: Add expiration dates for certificates
3. **Certificate Types**: Support multiple certificate types (degree, certification, license)
4. **Audit Log**: Track all admin actions for compliance
5. **Auto-Verification**: AI-powered certificate validation
6. **Email Notifications**: Send emails for approval/rejection (currently only Socket.io)
7. **Certificate Preview**: OCR to extract certificate details automatically

## Support

For issues or questions:
- Check server console logs
- Verify Socket.io connection in browser console
- Ensure all dependencies are installed (`npm install`)
- Restart both frontend and backend servers

---

**Congratulations!** The Admin + Certificate Verification System is now fully functional. Tutors can upload certificates, admins can verify them, and learners are protected by only seeing verified tutors.
