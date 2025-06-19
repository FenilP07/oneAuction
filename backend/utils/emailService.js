import nodemailer from "nodemailer";
import logger from "./logger.js";

const createTransporter = () => {
  if (process.env.EMAIL_SERVICE === "gmail") {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }
  return null;
};

const getPasswordResetEmailTemplate = (name, resetUrl) => {
  return {
    subject: "Password Reset Request",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Reset</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background: #007bff; 
            color: white; 
            text-decoration: none; 
            border-radius: 4px; 
            margin: 20px 0;
          }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 4px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hello ${name},</h2>
            <p>We received a request to reset your password. If you made this request, click the button below to reset your password:</p>
            
            <a href="${resetUrl}" class="button">Reset Password</a>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
            
            <div class="warning">
              <strong>Important:</strong>
              <ul>
                <li>This link will expire in 15 minutes for security reasons</li>
                <li>If you didn't request this password reset, please ignore this email</li>
                <li>Your password will remain unchanged until you create a new one</li>
              </ul>
            </div>
            
            <p>If you're having trouble or didn't request this reset, please contact our support team.</p>
          </div>
          <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} Your App Name. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Hello ${name},
      
      We received a request to reset your password. If you made this request, visit this link to reset your password:
      
      ${resetUrl}
      
      This link will expire in 15 minutes for security reasons.
      
      If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
      
      If you're having trouble, please contact our support team.
      
      This is an automated message, please do not reply to this email.
    `,
  };
};

// Send password reset email
export const sendPasswordResetEmail = async ({
  email,
  name,
  resetToken,
  resetUrl,
}) => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      throw new Error("Email service not configured");
    }

    const emailTemplate = getPasswordResetEmailTemplate(name, resetUrl);

    const mailOptions = {
      from: "OneAuction",
      to: email,
      subject: emailTemplate.subject,
      text: emailTemplate.text,
      html: emailTemplate.html,
    };

    const result = await transporter.sendMail(mailOptions);
    logger.info("Password reset email sent successfully:", result.messageId);
    return result;
  } catch (error) {
    logger.error("Error sending password reset email:", error);
    throw new Error("Failed to send password reset email");
  }
};
