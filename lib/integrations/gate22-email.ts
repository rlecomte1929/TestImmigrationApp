import type { AgentPlan } from "@/lib/types";

interface EmailConfig {
  gatewayUrl?: string;
}

interface EmailRequest {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

interface MCPRequest {
  method: string;
  params?: any;
}

interface MCPResponse {
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

class Gate22EmailClient {
  private config: EmailConfig;
  private sessionId: string | null = null;

  constructor(config: EmailConfig = {}) {
    this.config = {
      gatewayUrl: config.gatewayUrl || process.env.GATE22_MCP_URL,
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (!this.config.gatewayUrl) {
      throw new Error('Gate.22 MCP URL is required');
    }

    try {
      const response = await fetch(this.config.gatewayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: '1',
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: {
              name: 'immigration-planner',
              version: '1.0.0',
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gate.22 initialize failed: ${response.status} ${response.statusText}`);
      }

      // Extract session ID from response headers
      this.sessionId = response.headers.get('mcp-session-id');
      
      if (!this.sessionId) {
        throw new Error('No session ID returned from Gate.22 initialize');
      }

      console.log('Gate.22 initialized with session ID:', this.sessionId);
    } catch (error) {
      console.error('Failed to initialize Gate.22:', error);
      throw error;
    }
  }

  private async callMCP(request: MCPRequest): Promise<MCPResponse> {
    if (!this.config.gatewayUrl) {
      throw new Error('Gate.22 MCP URL is required');
    }

    // Initialize if we don't have a session ID
    if (!this.sessionId) {
      await this.initialize();
    }

    try {
      const requestBody = {
        jsonrpc: '2.0',
        id: Math.random().toString(36).substring(7),
        ...request,
      };

      console.log('Gate.22 MCP Request:', JSON.stringify(requestBody, null, 2));
      console.log('Gate.22 Gateway URL:', this.config.gatewayUrl);
      console.log('Session ID:', this.sessionId);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.sessionId) {
        headers['mcp-session-id'] = this.sessionId;
      }

      const response = await fetch(this.config.gatewayUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      console.log('Gate.22 Response Status:', response.status, response.statusText);
      
      const responseText = await response.text();
      console.log('Gate.22 Response Body:', responseText);

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(`Gmail OAuth authorization expired or missing. Please re-authorize Gmail access in your Gate.22 dashboard. Status: ${response.status} ${response.statusText}. Response: ${responseText}`);
        }
        throw new Error(`Gate.22 MCP call failed: ${response.status} ${response.statusText}. Response: ${responseText}`);
      }

      try {
        const data = JSON.parse(responseText);
        return data;
      } catch (parseError) {
        throw new Error(`Failed to parse Gate.22 response as JSON: ${responseText}`);
      }
    } catch (error) {
      console.error('Failed to call Gate.22 MCP:', error);
      throw error;
    }
  }

  async searchTools(query: string = 'email'): Promise<any[]> {
    try {
      const response = await this.callMCP({
        method: 'tools/call',
        params: {
          name: 'SEARCH_TOOLS',
          arguments: {
            query: query,
          },
        },
      });

      if (response.error) {
        throw new Error(`MCP Error: ${response.error.message}`);
      }

      console.log('Search tools response:', response.result);
      return response.result?.content || [];
    } catch (error) {
      console.error('Failed to search tools:', error);
      throw error;
    }
  }

  async listTools(): Promise<any[]> {
    try {
      // First try the standard MCP tools/list
      const response = await this.callMCP({
        method: 'tools/list',
      });

      if (response.error) {
        // If tools/list fails, fall back to SEARCH_TOOLS
        console.log('tools/list failed, trying SEARCH_TOOLS');
        return await this.searchTools('email send mail');
      }

      return response.result?.tools || [];
    } catch (error) {
      console.error('Failed to list tools:', error);
      // Try search tools as fallback
      try {
        return await this.searchTools('email send mail');
      } catch (searchError) {
        console.error('Search tools also failed:', searchError);
        throw error;
      }
    }
  }

  async sendEmail(emailRequest: EmailRequest): Promise<boolean> {
    try {
      console.log('Sending email via Gate.22 Gmail tool...');
      console.log('Email request:', {
        to: emailRequest.to,
        subject: emailRequest.subject,
        htmlContentLength: emailRequest.htmlContent?.length || 0
      });

      // Reset session if we have authentication issues
      this.sessionId = null;

      // First search for Gmail tools to ensure they're available
      const searchResponse = await this.callMCP({
        method: 'tools/call',
        params: {
          name: 'SEARCH_TOOLS',
          arguments: {
            intent: 'send email gmail',
          },
        },
      });

      if (searchResponse.error) {
        if (searchResponse.error.message?.includes('403') || searchResponse.error.message?.includes('Forbidden')) {
          throw new Error(`Gmail OAuth authorization required. Please re-authorize Gmail access in your Gate.22 dashboard: ${searchResponse.error.message}`);
        }
        throw new Error(`Failed to search for Gmail tools: ${searchResponse.error.message}`);
      }

      console.log('Found Gmail tools, proceeding to send email...');

      // Use EXECUTE_TOOL to call GMAIL__SEND_EMAIL
      const response = await this.callMCP({
        method: 'tools/call',
        params: {
          name: 'EXECUTE_TOOL',
          arguments: {
            tool_name: 'GMAIL__SEND_EMAIL',
            tool_arguments: {
              sender: 'me', // Use authenticated user
              recipient: emailRequest.to,
              subject: emailRequest.subject,
              body: emailRequest.textContent || this.htmlToText(emailRequest.htmlContent),
            },
          },
        },
      });

      if (response.error) {
        if (response.error.message?.includes('403') || response.error.message?.includes('Forbidden')) {
          throw new Error(`Gmail OAuth authorization required. Please re-authorize Gmail access in your Gate.22 dashboard: ${response.error.message}`);
        }
        throw new Error(`Email sending failed: ${response.error.message}`);
      }

      console.log('Email sent successfully via Gate.22:', response.result);
      return true;
    } catch (error) {
      console.error('Failed to send email via Gate.22:', error);
      throw error;
    }
  }

  async testConnection(): Promise<{ success: boolean; tools: any[]; error?: string }> {
    try {
      const tools = await this.listTools();
      return {
        success: true,
        tools,
      };
    } catch (error) {
      return {
        success: false,
        tools: [],
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
      .trim();
  }
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

    const visaName = plan.userContext.visaType || 'Immigration';
    const subject = `Your ${visaName} Plan`;
  
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

export const gate22EmailClient = new Gate22EmailClient();