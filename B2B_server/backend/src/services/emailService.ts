import nodemailer from 'nodemailer';
import { config } from '../config/env';

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Create transporter with SMTP configuration
    this.transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE, // true for 465, false for other ports
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASSWORD,
      },
    });
  }

  /**
   * Send OTP email
   * Comment: Required for sending password reset OTP to user email
   */
  async sendOTPEmail(email: string, otp: string): Promise<void> {
    try {
      // Create email template with OTP
      const emailTemplate = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Password Reset OTP</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f4f4f4; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .otp-code { 
              font-size: 32px; 
              font-weight: bold; 
              color: #007bff; 
              text-align: center; 
              padding: 20px; 
              background-color: #f8f9fa; 
              border: 2px dashed #007bff; 
              margin: 20px 0; 
            }
            .warning { color: #dc3545; font-weight: bold; }
            .footer { background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>You have requested to reset your password. Use the OTP code below to complete the process:</p>
              
              <div class="otp-code">${otp}</div>
              
              <p><span class="warning">Important:</span></p>
              <ul>
                <li>This OTP is valid for <strong>15 minutes</strong> only</li>
                <li>Do not share this code with anyone</li>
                <li>If you didn't request this password reset, please ignore this email</li>
              </ul>
              
              <p>If you have any questions, please contact our support team.</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>&copy; 2024 B2B Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Send email via SMTP
      const mailOptions = {
        from: `"${config.SMTP_FROM_NAME}" <${config.SMTP_FROM_EMAIL}>`,
        to: email,
        subject: 'Password Reset OTP - B2B Platform',
        html: emailTemplate,
      };

      // Send email
      const info = await this.transporter.sendMail(mailOptions);
      
      // Log email sent event
      console.log(`Email sent successfully to ${email} with OTP: ${otp}`);
      console.log('Message ID:', info.messageId);
      
    } catch (error) {
      console.error('Email sending error:', error);
      throw new Error('Email sending failed');
    }
  }

  /**
   * Send connection request reminder email
   * Sent when user hasn't acted on a connection request for 24+ hours
   */
  async sendConnectionRequestReminder(
    recipientEmail: string,
    recipientName: string,
    senderName: string,
    hoursElapsed: number
  ): Promise<void> {
    try {
      const emailTemplate = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Pending Connection Request</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
            .header { background-color: #007bff; padding: 30px; text-align: center; color: white; border-radius: 5px 5px 0 0; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { 
              padding: 30px; 
              background-color: white; 
              border: 1px solid #e0e0e0;
            }
            .highlight { color: #007bff; font-weight: bold; }
            .action-section { 
              margin: 30px 0; 
              padding: 20px; 
              background-color: #f0f7ff; 
              border-left: 4px solid #007bff; 
              border-radius: 4px;
            }
            .cta-button {
              display: inline-block;
              padding: 12px 30px;
              background-color: #007bff;
              color: white;
              text-decoration: none;
              border-radius: 4px;
              margin: 10px 0;
              font-weight: bold;
            }
            .cta-button:hover { background-color: #0056b3; }
            .footer { 
              background-color: #f4f4f4; 
              padding: 20px; 
              text-align: center; 
              font-size: 12px; 
              color: #666;
              border-radius: 0 0 5px 5px;
            }
            .time-info { color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📬 Pending Connection Request</h1>
            </div>
            <div class="content">
              <p>Hi <span class="highlight">${recipientName}</span>,</p>
              
              <p>You have a pending connection request from <span class="highlight">${senderName}</span> that has been waiting for your response for <span class="highlight">${Math.round(hoursElapsed)} hours</span>.</p>
              
              <div class="action-section">
                <p><strong>What's next?</strong></p>
                <p>You can:</p>
                <ul>
                  <li>✅ Accept the connection request</li>
                  <li>❌ Decline if you're not interested</li>
                  <li>⏳ Review their profile before deciding</li>
                </ul>
              </div>

              <p>
                <a href="${config.APP_URL}/connections" class="cta-button">View Connection Request</a>
              </p>

              <p class="time-info">
                This is a reminder that you haven't yet responded to this connection request. We'll send you another reminder in 4 hours if you don't take action.
              </p>
              
              <p>If you have any questions, please contact our support team.</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>&copy; 2024 B2B Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: `"${config.SMTP_FROM_NAME}" <${config.SMTP_FROM_EMAIL}>`,
        to: recipientEmail,
        subject: `Reminder: Pending Connection Request from ${senderName}`,
        html: emailTemplate,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Connection request reminder sent to ${recipientEmail}. Message ID: ${info.messageId}`);
    } catch (error) {
      console.error('Error sending connection request reminder:', error);
      throw new Error('Failed to send connection request reminder');
    }
  }

  /**
   * Send invitation request reminder email
   * Sent when user hasn't acted on an invitation request for 24+ hours
   */
  async sendInvitationRequestReminder(
    recipientEmail: string,
    recipientName: string,
    senderName: string,
    companyName: string,
    hoursElapsed: number
  ): Promise<void> {
    try {
      const emailTemplate = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Pending Company Page Invitation</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
            .header { background-color: #28a745; padding: 30px; text-align: center; color: white; border-radius: 5px 5px 0 0; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { 
              padding: 30px; 
              background-color: white; 
              border: 1px solid #e0e0e0;
            }
            .highlight { color: #28a745; font-weight: bold; }
            .company-box {
              margin: 20px 0;
              padding: 15px;
              background-color: #f0fff4;
              border-left: 4px solid #28a745;
              border-radius: 4px;
            }
            .action-section { 
              margin: 30px 0; 
              padding: 20px; 
              background-color: #f0fff4; 
              border-left: 4px solid #28a745; 
              border-radius: 4px;
            }
            .cta-button {
              display: inline-block;
              padding: 12px 30px;
              background-color: #28a745;
              color: white;
              text-decoration: none;
              border-radius: 4px;
              margin: 10px 0;
              font-weight: bold;
            }
            .cta-button:hover { background-color: #218838; }
            .footer { 
              background-color: #f4f4f4; 
              padding: 20px; 
              text-align: center; 
              font-size: 12px; 
              color: #666;
              border-radius: 0 0 5px 5px;
            }
            .time-info { color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏢 Company Page Invitation</h1>
            </div>
            <div class="content">
              <p>Hi <span class="highlight">${recipientName}</span>,</p>
              
              <p>You have a pending invitation to join <span class="highlight">${companyName}</span> company page from <span class="highlight">${senderName}</span>.</p>

              <div class="company-box">
                <p><strong>Company:</strong> ${companyName}</p>
                <p><strong>Invitation from:</strong> ${senderName}</p>
                <p><strong>Pending for:</strong> ${Math.round(hoursElapsed)} hours</p>
              </div>
              
              <div class="action-section">
                <p><strong>What can you do?</strong></p>
                <ul>
                  <li>✅ Accept the invitation to join the company page</li>
                  <li>❌ Decline if you're not interested</li>
                  <li>📋 Review the company page details before deciding</li>
                </ul>
              </div>

              <p>
                <a href="${config.APP_URL}/company-pages" class="cta-button">View Invitation</a>
              </p>

              <p class="time-info">
                This is a reminder that you haven't yet responded to this invitation. We'll send you another reminder in 4 hours if you don't take action.
              </p>
              
              <p>If you have any questions, please contact our support team.</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>&copy; 2024 B2B Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: `"${config.SMTP_FROM_NAME}" <${config.SMTP_FROM_EMAIL}>`,
        to: recipientEmail,
        subject: `Reminder: Pending Invitation to ${companyName}`,
        html: emailTemplate,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Invitation request reminder sent to ${recipientEmail}. Message ID: ${info.messageId}`);
    } catch (error) {
      console.error('Error sending invitation request reminder:', error);
      throw new Error('Failed to send invitation request reminder');
    }
  }

  /**
   * Verify SMTP connection
   * Comment: Useful for testing SMTP configuration
   */
  async verifySMTPConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('SMTP connection verified successfully');
      return true;
    } catch (error) {
      console.error('SMTP connection failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
export default emailService;
