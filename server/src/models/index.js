class User {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.password = data.password;
    this.role = data.role || 'learner'; // learner, tutor, admin
    this.subjects = data.subjects || [];
    this.isOnline = data.isOnline || false;
    this.rating = data.rating || 0;
    this.reviewCount = data.reviewCount || 0;
    this.createdAt = data.createdAt || new Date();
    // Certificate verification fields (for tutors)
    this.isVerified = data.isVerified || false;
    this.verificationStatus = data.verificationStatus || 'pending'; // pending, approved, rejected
    this.certificateUrl = data.certificateUrl || null;
    this.certificateRejectionReason = data.certificateRejectionReason || null;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      password: this.password, // Include password in saved data
      role: this.role,
      subjects: this.subjects,
      isOnline: this.isOnline,
      rating: this.rating,
      reviewCount: this.reviewCount,
      createdAt: this.createdAt,
      isVerified: this.isVerified,
      verificationStatus: this.verificationStatus,
      certificateUrl: this.certificateUrl,
      certificateRejectionReason: this.certificateRejectionReason
    };
  }
}

class TutorRequest {
  constructor(data) {
    this.id = data.id;
    this.learner = data.learner;
    this.tutor = data.tutor;
    this.subject = data.subject;
    this.status = data.status || 'pending';
    this.sessionDate = data.sessionDate || null;
    this.completedAt = data.completedAt || null;
    this.reviewedAt = data.reviewedAt || null;
    this.createdAt = data.createdAt || new Date();
  }
}

class Review {
  constructor(data) {
    this.id = data.id;
    this.request = data.request;
    this.learner = data.learner;
    this.tutor = data.tutor;
    this.rating = data.rating;
    this.comment = data.comment;
    this.createdAt = data.createdAt || new Date();
  }
}

class Notification {
  constructor(data) {
    this.id = data.id;
    this.user = data.user;
    this.message = data.message;
    this.type = data.type;
    this.isRead = data.isRead || false;
    this.createdAt = data.createdAt || new Date();
  }
}

module.exports = {
  User,
  TutorRequest,
  Review,
  Notification
};