// Helper function to generate working meeting links
const generateMeetLink = () => {
  // Generate unique room name with timestamp for uniqueness
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substr(2, 8);
  const roomName = `TutorSession-${timestamp}-${randomId}`;
  
  // Use Jitsi Meet - it's free, works instantly, and doesn't require API setup
  // This creates a real working video conference room immediately
  const jitsiLink = `https://meet.jit.si/${roomName}`;
  
  return jitsiLink;
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Calculate average rating
const calculateAverageRating = (reviews) => {
  if (reviews.length === 0) return 0;
  const sum = reviews.reduce((total, review) => total + review.rating, 0);
  return Math.round((sum / reviews.length) * 10) / 10; // Round to 1 decimal place
};

module.exports = {
  generateMeetLink,
  generateOTP,
  calculateAverageRating
};