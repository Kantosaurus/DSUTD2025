const nodemailer = require('nodemailer');
const EMAIL_CONFIG = require('../config/email');

// Create email transporter
const createEmailTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD // Use App Password for Gmail
    }
  });
};

// Send verification email
const sendVerificationEmail = async (email, verificationCode, studentId) => {
  try {
    const transporter = createEmailTransporter();
    
    const mailOptions = {
      from: `"${EMAIL_CONFIG.FROM_NAME}" <${EMAIL_CONFIG.FROM_EMAIL}>`,
      to: email,
      subject: 'Email Verification - DSUTD 2025',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to DSUTD 2025!</h2>
          <p>Dear Student,</p>
          <p>Thank you for registering with DSUTD 2025. To complete your registration, please verify your email address using the verification code below:</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; margin: 0; font-size: 32px; letter-spacing: 5px;">${verificationCode}</h1>
          </div>
          <p>This verification code will expire in ${EMAIL_CONFIG.VERIFICATION_CODE_EXPIRY_MINUTES} minutes.</p>
          <p>If you didn't create an account with us, please ignore this email.</p>
          <p>Best regards,<br>The DSUTD 2025 Team</p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to user: ${email.substring(0, 3)}***@${email.split('@')[1]}`);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken, studentId) => {
  try {
    const transporter = createEmailTransporter();
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: `"${EMAIL_CONFIG.FROM_NAME}" <${EMAIL_CONFIG.FROM_EMAIL}>`,
      to: email,
      subject: 'Password Reset - DSUTD 2025',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Dear Student,</p>
          <p>You requested a password reset for your DSUTD 2025 account. Click the link below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
          </div>
          <p>This link will expire in 1 hour for security reasons.</p>
          <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
          <p>Best regards,<br>The DSUTD 2025 Team</p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to user: ${email.substring(0, 3)}***@${email.split('@')[1]}`);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

module.exports = {
  createEmailTransporter,
  sendVerificationEmail,
  sendPasswordResetEmail
};