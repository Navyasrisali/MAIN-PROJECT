const { transporter } = require('../config/email');

class EmailService {
  // Send OTP email for password reset
  static async sendOTPEmail(email, userName, otp) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: '🔐 Password Reset OTP - Peer Learning Platform',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #007bff;">🔐 Password Reset Request</h2>
            <p>Hello <strong>${userName}</strong>,</p>
            <p>You requested to reset your password. Please use the following OTP to verify your identity:</p>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
            </div>
            <p><strong>⏰ This OTP will expire in 5 minutes.</strong></p>
            <p>If you didn't request this, please ignore this email.</p>
            <hr style="margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">Peer Learning Platform</p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`📧 Password reset OTP sent to ${email}: ${otp}`);
      return true;
    } catch (error) {
      console.error('Error sending OTP email:', error);
      throw error;
    }
  }

  // Send meeting confirmation email
  static async sendMeetingEmail(toEmail, userName, otherPersonName, isLearner, request, meetLink) {
    try {
      const roleText = isLearner ? 'learner' : 'tutor';
      const otherRoleText = isLearner ? 'tutor' : 'learner';
      
      const emailContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }
            .meet-button { display: inline-block; background: #4285f4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 15px 0; text-decoration: none; }
            .details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; padding: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎓 Tutoring Session Confirmed!</h1>
            </div>
            <div class="content">
              <h2>Hello ${userName}!</h2>
              <p>Great news! Your tutoring session has been scheduled and confirmed.</p>
              
              <div class="details">
                <p><strong>📚 Subject:</strong> ${request.subject}</p>
                <p><strong>👥 ${otherRoleText.charAt(0).toUpperCase() + otherRoleText.slice(1)}:</strong> ${otherPersonName}</p>
                <p><strong>🕐 Scheduled Time:</strong> ${new Date(request.sessionDate).toLocaleString()}</p>
              </div>

              <div style="text-align: center;">
                <a href="${meetLink}" class="meet-button">🔗 Join Video Conference</a>
              </div>

              <p><strong>Meeting Link:</strong> <a href="${meetLink}" style="color: #4285f4;">${meetLink}</a></p>
              <p><em>💡 This is a secure Jitsi Meet room - no downloads required, works in your browser!</em></p>
              
              <div style="background: #e8f4fd; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <h4 style="margin-top: 0; color: #1565c0;">📝 Important Reminders:</h4>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Join the meeting <strong>5 minutes early</strong> to test your setup</li>
                  <li>Ensure you have a <strong>stable internet connection</strong></li>
                  <li>Test your <strong>camera and microphone</strong> beforehand</li>
                  <li>Have your <strong>study materials ready</strong></li>
                  <li>Keep the meeting link handy for easy access</li>
                </ul>
              </div>

              <p>If you need to reschedule or have any questions, please contact your ${otherRoleText} directly.</p>
              
              <p style="text-align: center; margin-top: 30px;">
                <strong>Happy Learning! 🚀</strong><br>
                <em>The TutorConnect Team</em>
              </p>
            </div>
            <div class="footer">
              <p>This is an automated message from TutorConnect Platform</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: `"TutorConnect Platform" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: `🎓 Session Confirmed: ${request.subject} - Ready to Start Learning!`,
        html: emailContent
      };

      await transporter.sendMail(mailOptions);
      console.log(`📧 Professional meeting email sent to ${roleText}: ${toEmail}`);
      return true;
    } catch (error) {
      console.log(`📧 Email error for ${toEmail}:`, error.message);
      throw error;
    }
  }
}

module.exports = EmailService;