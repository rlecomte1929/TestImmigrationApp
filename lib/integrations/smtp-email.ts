import * as nodemailer from 'nodemailer';
import type { AgentPlan } from "@/lib/types";

interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  secure?: boolean;
}

interface EmailRequest {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

// HTML escape function to prevent injection
function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

class SMTPEmailClient {
  private config: EmailConfig;
  private transporter: nodemailer.Transporter | null = null;

  constructor(config?: Partial<EmailConfig>) {
    this.config = {
      smtpHost: config?.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com',
      smtpPort: config?.smtpPort || parseInt(process.env.SMTP_PORT || '587'),
      smtpUser: config?.smtpUser || process.env.SMTP_USER || '',
      smtpPass: config?.smtpPass || process.env.SMTP_PASS || '',
      secure: config?.secure || false, // true for 465, false for other ports
    };
  }

  async initialize(): Promise<void> {
    if (!this.config.smtpUser || !this.config.smtpPass) {
      throw new Error('SMTP credentials are required. Please set SMTP_USER and SMTP_PASS environment variables.');
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: this.config.smtpHost,
        port: this.config.smtpPort,
        secure: this.config.secure,
        auth: {
          user: this.config.smtpUser,
          pass: this.config.smtpPass,
        },
        tls: {
          rejectUnauthorized: false // Allow self-signed certificates
        }
      });

      // Verify connection
      await this.transporter.verify();
      console.log('SMTP server connected successfully');
    } catch (error) {
      console.error('Failed to initialize SMTP client:', error);
      throw new Error(`SMTP initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async sendEmail(emailRequest: EmailRequest): Promise<boolean> {
    try {
      console.log('Sending email via SMTP...');
      console.log('Email request:', {
        to: emailRequest.to,
        subject: emailRequest.subject,
        htmlContentLength: emailRequest.htmlContent?.length || 0
      });

      // Initialize if not already done
      if (!this.transporter) {
        await this.initialize();
      }

      if (!this.transporter) {
        throw new Error('SMTP transporter not initialized');
      }

      const mailOptions = {
        from: this.config.smtpUser,
        to: emailRequest.to,
        subject: emailRequest.subject,
        html: emailRequest.htmlContent,
        text: emailRequest.textContent || this.htmlToText(emailRequest.htmlContent),
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send email via SMTP:', error);
      throw new Error(`Email sending failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.initialize();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private htmlToText(html: string): string {
    // Simple HTML to text conversion
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }
}

export function generateEmailReport(plan: AgentPlan, userEmail: string): EmailRequest {
  try {
    console.log('Generating email report for plan:', JSON.stringify(plan, null, 2));
    
    if (!plan || !plan.planSummary) {
      throw new Error('Invalid plan data: missing planSummary');
    }
    
    if (!plan.userContext) {
      throw new Error('Invalid plan data: missing userContext');
    }
    
    if (!plan.workstreams) {
      throw new Error('Invalid plan data: missing workstreams');
    }

    // const visaName = plan.userContext.visaType || 'Immigration';
    const subject = `Your Detailed Plan`;
  
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; line-height: 1.5; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 0; background-color: #ffffff;">
      
      <!-- Header -->
      <div style="background: #000000; color: white; padding: 40px 32px; text-align: center;">
        <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; letter-spacing: -0.02em;">Immigration Plan</h1>
        <p style="margin: 0; font-size: 16px; opacity: 0.7; font-weight: 400;">Your step-by-step guide</p>
      </div>

      <!-- Main Content -->
      <div style="padding: 32px;">
        
        <!-- Overview -->
        <div style="border-bottom: 1px solid #e5e7eb; padding-bottom: 24px; margin-bottom: 32px;">
          <h2 style="color: #1a1a1a; margin: 0 0 16px 0; font-size: 20px; font-weight: 600;">${escapeHtml(plan.planSummary.headline || '')}</h2>
          <div style="margin-bottom: 20px;">
            ${plan.userContext.visaType ? `<div style="color: #6b7280; font-size: 14px; margin-bottom: 4px;">Visa Type: ${escapeHtml(plan.userContext.visaType)}</div>` : ''}
            ${plan.userContext.deadline ? `<div style="color: #6b7280; font-size: 14px; margin-bottom: 4px;">Deadline: ${new Date(plan.userContext.deadline).toLocaleDateString()}</div>` : ''}
            ${plan.userContext.currentStatus ? `<div style="color: #6b7280; font-size: 14px; margin-bottom: 4px;">Status: ${escapeHtml(plan.userContext.currentStatus)}</div>` : ''}
          </div>
          <div style="color: #4b5563; font-size: 15px; line-height: 1.6;">
            ${(plan.planSummary.overview || []).map(item => `<div style="margin: 12px 0;">${escapeHtml(item || '')}</div>`).join('')}
          </div>
        </div>

        <!-- Steps -->
        <h2 style="color: #1a1a1a; margin: 0 0 24px 0; font-size: 18px; font-weight: 600;">Action Items</h2>
        
        ${(plan.workstreams || []).map((workstream, idx) => `
          <div style="border: 1px solid #e5e7eb; margin-bottom: 24px; border-radius: 8px;">
            <div style="background: #f9fafb; padding: 20px; border-bottom: 1px solid #e5e7eb;">
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">${idx + 1}. ${escapeHtml(workstream.title || '')}</h3>
              <div style="color: #6b7280; font-size: 14px;">${workstream.progress}% complete</div>
            </div>
            
            <div style="padding: 20px;">
              ${(workstream.steps || []).map(step => `
                <div style="margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #f3f4f6;">
                  <h4 style="color: #1a1a1a; margin: 0 0 8px 0; font-size: 15px; font-weight: 500;">${escapeHtml(step.name || '')}</h4>
                  ${step.deadline ? `<div style="color: #6b7280; margin: 4px 0; font-size: 14px;">Due: ${new Date(step.deadline).toLocaleDateString()}</div>` : ''}
                  ${step.estimatedTime ? `<div style="color: #6b7280; margin: 4px 0; font-size: 14px;">Time needed: ${escapeHtml(step.estimatedTime)}</div>` : ''}
                  
                  ${step.instructions && step.instructions.length > 0 ? `
                    <div style="margin-top: 12px;">
                      <div style="color: #4b5563; font-size: 14px; margin-bottom: 8px;">What to do:</div>
                      ${(step.instructions || []).slice(0, 2).map((instruction, idx) => `
                        <div style="color: #6b7280; margin: 6px 0; font-size: 14px; line-height: 1.5;">
                          ${idx + 1}. ${escapeHtml(instruction || '')}
                        </div>
                      `).join('')}
                      ${(step.instructions || []).length > 2 ? `<div style="color: #9ca3af; font-size: 13px; margin: 8px 0 0 0;">+ ${(step.instructions || []).length - 2} more steps</div>` : ''}
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}

        ${plan.timeline && plan.timeline.length > 0 ? `
          <!-- Timeline -->
          <div style="border: 1px solid #e5e7eb; margin-top: 32px; border-radius: 8px;">
            <div style="background: #f9fafb; padding: 20px; border-bottom: 1px solid #e5e7eb;">
              <h3 style="color: #1a1a1a; margin: 0; font-size: 16px; font-weight: 600;">Timeline</h3>
            </div>
            <div style="padding: 20px;">
              ${(plan.timeline || []).slice(0, 4).map((item, idx) => `
                <div style="display: flex; padding: 12px 0; ${idx < (plan.timeline || []).slice(0, 4).length - 1 ? 'border-bottom: 1px solid #f3f4f6;' : ''}">
                  <div style="background: #f3f4f6; color: #1a1a1a; padding: 8px 12px; border-radius: 6px; margin-right: 16px; font-weight: 500; font-size: 13px; min-width: 80px; text-align: center;">
                    ${new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div>
                    <div style="font-weight: 500; color: #1a1a1a; font-size: 14px;">${escapeHtml(item.title || '')}</div>
                    ${item.description ? `<div style="color: #6b7280; font-size: 13px; margin-top: 2px;">${escapeHtml(item.description)}</div>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Footer -->
        <div style="border-top: 1px solid #e5e7eb; margin-top: 48px; padding-top: 32px; text-align: center;">
          <div style="color: #6b7280; margin: 0 0 16px 0; font-size: 14px;">Generated by Bureaucracy Navigator</div>
          <div style="color: #9ca3af; margin: 0; font-size: 13px;">Always verify requirements with official government sources before submitting applications.</div>
        </div>
      </div>
    </body>
    </html>
  `;

    return {
      to: userEmail,
      subject,
      htmlContent,
    };
  } catch (error) {
    console.error('Error in generateEmailReport:', error);
    throw new Error(`Email template generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export const smtpEmailClient = new SMTPEmailClient();