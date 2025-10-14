import nodemailer from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

const emailConfig: EmailConfig = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'p200005@pwr.nu.edu.pk',
    pass: 'amlv xjag tdhb filu'
  }
};

const transporter = nodemailer.createTransport(emailConfig);

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
}

export class EmailService {
  static async sendEmail(template: EmailTemplate): Promise<boolean> {
    try {
      const mailOptions = {
        from: `"FleetXchange" <${emailConfig.auth.user}>`,
        to: template.to,
        subject: template.subject,
        html: template.html
      };

      const result = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  static async sendLoadNotificationToTransporters(clientEmail: string, clientName: string, loadTitle: string, loadId: string): Promise<void> {
    const transporterEmails = await this.getTransporterEmails();
    
    const emailPromises = transporterEmails.map(email => 
      this.sendEmail({
        to: email,
        subject: `New Load Available: ${loadTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #33A852;">New Load Available!</h2>
            <p>Hello Transporter,</p>
            <p>A new load has been posted by <strong>${clientName}</strong> (${clientEmail}).</p>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Load Details:</h3>
              <p><strong>Title:</strong> ${loadTitle}</p>
              <p><strong>Load ID:</strong> ${loadId}</p>
            </div>
            <p>Please log in to your transporter portal to view full details and place your bid.</p>
            <p>Best regards,<br>FleetXchange Team</p>
          </div>
        `
      })
    );

    await Promise.all(emailPromises);
  }

  static async sendBidNotificationToClient(transporterEmail: string, transporterName: string, clientEmail: string, loadTitle: string, bidAmount: number): Promise<void> {
    await this.sendEmail({
      to: clientEmail,
      subject: `New Bid Received: ${loadTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #33A852;">New Bid Received!</h2>
          <p>Hello Client,</p>
          <p>You have received a new bid from <strong>${transporterName}</strong> (${transporterEmail}).</p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Bid Details:</h3>
            <p><strong>Load:</strong> ${loadTitle}</p>
            <p><strong>Bid Amount:</strong> $${bidAmount.toLocaleString()}</p>
            <p><strong>Transporter:</strong> ${transporterName}</p>
          </div>
          <p>Please log in to your client portal to review and manage bids.</p>
          <p>Best regards,<br>FleetXchange Team</p>
        </div>
      `
    });
  }

  static async sendDocumentStatusUpdateNotification(userEmail: string, userName: string, documentType: string, status: string, adminNotes?: string): Promise<void> {
    const statusColor = status === 'APPROVED' ? '#33A852' : status === 'REJECTED' ? '#dc2626' : '#f59e0b';
    
    await this.sendEmail({
      to: userEmail,
      subject: `Document Status Update: ${documentType}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${statusColor};">Document Status Update</h2>
          <p>Hello ${userName},</p>
          <p>Your document status has been updated by the admin.</p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Document Details:</h3>
            <p><strong>Document Type:</strong> ${documentType}</p>
            <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${status}</span></p>
            ${adminNotes ? `<p><strong>Admin Notes:</strong> ${adminNotes}</p>` : ''}
          </div>
          <p>Please log in to your portal to view the updated status.</p>
          <p>Best regards,<br>FleetXchange Team</p>
        </div>
      `
    });
  }

  static async sendDocumentVerificationNotification(userEmail: string, userName: string, fileName: string, status: string, adminNotes: string): Promise<void> {
    const statusText = status === 'APPROVED' ? 'approved' : status === 'REJECTED' ? 'rejected' : 'pending';
    const statusColor = status === 'APPROVED' ? '#33A852' : status === 'REJECTED' ? '#DC2626' : '#F59E0B';
    
    await this.sendEmail({
      to: userEmail,
      subject: `Document Verification Update: ${fileName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${statusColor};">Document Verification Update</h2>
          <p>Hello ${userName},</p>
          <p>Your document <strong>${fileName}</strong> has been <strong style="color: ${statusColor};">${statusText}</strong>.</p>
          ${adminNotes ? `
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Admin Notes:</h3>
              <p>${adminNotes}</p>
            </div>
          ` : ''}
          <p>Please log in to your portal to view the full details.</p>
          <p>Best regards,<br>FleetXchange Team</p>
        </div>
      `
    });
  }

  private static async getTransporterEmails(): Promise<string[]> {
    try {
      const { getUsersCollection } = require('../lib/mongodb');
      const usersCollection = getUsersCollection();
      
      const transporters = await usersCollection.find({
        userType: 'TRANSPORTER',
        status: 'ACTIVE'
      }, {
        projection: { email: 1 }
      }).toArray();
      
      return transporters.map((t: any) => t.email);
    } catch (error) {
      console.error('Failed to fetch transporter emails:', error);
      return [];
    }
  }
}