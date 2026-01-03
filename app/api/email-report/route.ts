import { NextRequest, NextResponse } from 'next/server';
import { smtpEmailClient, generateEmailReport } from '@/lib/integrations/smtp-email';
import type { AgentPlan } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    console.log('=== EMAIL REPORT API START ===');
    const body = await request.json();
    console.log('Request body keys:', Object.keys(body));
    console.log('Plan exists:', !!body.plan);
    console.log('UserEmail exists:', !!body.userEmail);
    
    const { plan, userEmail } = body;

    if (!plan) {
      console.log('ERROR: Plan is missing');
      return NextResponse.json(
        { error: 'Immigration plan is required' },
        { status: 400 }
      );
    }

    if (!userEmail) {
      console.log('ERROR: UserEmail is missing');
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Generate email content from plan
    console.log('About to generate email report...');
    const emailRequest = generateEmailReport(plan as AgentPlan, userEmail);
    console.log('Email request generated successfully');

    // Send email via SMTP
    console.log('About to send email via SMTP...');
    const success = await smtpEmailClient.sendEmail(emailRequest);
    console.log('Email send result:', success);

    if (success) {
      return NextResponse.json({
        message: 'Immigration plan emailed successfully',
        recipient: userEmail,
      });
    } else {
      throw new Error('Email sending failed');
    }
  } catch (error) {
    console.error('=== EMAIL REPORT ERROR ===');
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Full error object:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to send email report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}