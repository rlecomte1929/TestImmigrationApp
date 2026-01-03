import { NextRequest, NextResponse } from 'next/server';
import { googleCalendarClient } from '@/lib/integrations/calendar';
import type { AgentPlan } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    console.log('=== CALENDAR EVENTS API START ===');
    const body = await request.json();
    console.log('Request body keys:', Object.keys(body));
    
    const { plan } = body;

    if (!plan) {
      console.log('ERROR: Plan is missing');
      return NextResponse.json(
        { error: 'Immigration plan is required' },
        { status: 400 }
      );
    }

    // Generate calendar events from plan
    console.log('About to generate calendar events...');
    const result = await googleCalendarClient.createEventsFromPlan(plan as AgentPlan);
    console.log('Calendar events generated:', result);

    if (result.success) {
      return NextResponse.json({
        message: 'Calendar events generated successfully',
        events: result.events,
        totalEvents: result.events.length
      });
    } else {
      throw new Error('Calendar event generation failed');
    }
  } catch (error) {
    console.error('=== CALENDAR EVENTS ERROR ===');
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        error: 'Failed to generate calendar events',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}