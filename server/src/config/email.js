const nodemailer = require('nodemailer');
require('dotenv').config();

// Email Configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Test email configuration
const testEmailConnection = async () => {
  try {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      await transporter.verify();
      console.log('📧 Email server is ready to send messages');
    } else {
      console.log('⚠️ Email not configured - set EMAIL_USER and EMAIL_PASS in .env');
    }
  } catch (error) {
    console.log('⚠️ Email configuration issue:', error.message);
  }
};

module.exports = {
  transporter,
  testEmailConnection
};