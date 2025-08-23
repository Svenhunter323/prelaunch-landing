const nodemailer = require('nodemailer');
const cfg = require('../config');

let transporter = null;

function getTransporter() {
  // console.log('config [email]', cfg.email);
  if (!transporter && cfg.email.user && cfg.email.password) {
    transporter = nodemailer.createTransport({
      host: cfg.email.host,
      port: cfg.email.port,
      secure: cfg.email.secure,
      auth: {
        user: cfg.email.user,
        pass: cfg.email.password
      }
    });
  }
  return transporter;
}

async function sendVerificationEmail(email, token) {
  const transport = getTransporter();
  // console.log('[email] Transporter:', transport);
  if (!transport) {
    console.warn('[email] No email configuration found, skipping verification email');
    return;
  }

  const verifyUrl = `${process.env.PUBLIC_BASE_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
  
  const mailOptions = {
    from: cfg.email.from,
    to: email,
    subject: 'Verify your Zoggy account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Zoggy!</h2>
        <p>Thanks for joining our pre-launch waitlist. Please verify your email address to complete your registration.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${verifyUrl}">${verifyUrl}</a>
        </p>
        <p style="color: #666; font-size: 14px;">
          This link will expire in 24 hours.
        </p>
      </div>
    `
  };

  try {
    await transport.sendMail(mailOptions);
    console.log('[email] Verification email sent to', email);
  } catch (error) {
    console.error('[email] Failed to send verification email:', error.message);
    throw error;
  }
}

module.exports = { sendVerificationEmail };