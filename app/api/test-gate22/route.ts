import { NextRequest, NextResponse } from 'next/server';
import { gate22EmailClient } from '@/lib/integrations/gate22-email';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Gate.22 connection...');
    
    const result = await gate22EmailClient.testConnection();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Gate.22 connection successful',
        availableTools: result.tools,
        toolCount: result.tools.length,
        emailTools: result.tools.filter(tool => 
          tool.name?.toLowerCase().includes('email') || 
          tool.name?.toLowerCase().includes('mail') ||
          tool.name?.toLowerCase().includes('send')
        ),
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        gatewayUrl: process.env.GATE22_MCP_URL,
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Gate.22 test error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      gatewayUrl: process.env.GATE22_MCP_URL,
    }, { status: 500 });
  }
}