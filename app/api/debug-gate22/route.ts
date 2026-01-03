import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const gatewayUrl = process.env.GATE22_MCP_URL;
  
  if (!gatewayUrl) {
    return NextResponse.json({
      error: 'GATE22_MCP_URL not configured',
    }, { status: 500 });
  }

  console.log('Testing Gate.22 URL:', gatewayUrl);

  try {
    // Test 1: Simple GET request to understand the endpoint
    console.log('Test 1: GET request');
    const getResponse = await fetch(gatewayUrl, {
      method: 'GET',
    });
    
    const getResponseText = await getResponse.text();
    console.log('GET Response:', getResponse.status, getResponseText);

    // Test 2: Try MCP initialization request
    console.log('Test 2: MCP initialize request');
    const initRequest = {
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
    };

    const initResponse = await fetch(gatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(initRequest),
    });

    const initResponseText = await initResponse.text();
    console.log('Initialize Response:', initResponse.status, initResponseText);

    // Test 3: Try tools/list after initialization
    console.log('Test 3: Tools list request');
    const toolsRequest = {
      jsonrpc: '2.0',
      id: '2',
      method: 'tools/list',
      params: {},
    };

    const toolsResponse = await fetch(gatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(toolsRequest),
    });

    const toolsResponseText = await toolsResponse.text();
    console.log('Tools Response:', toolsResponse.status, toolsResponseText);

    return NextResponse.json({
      gatewayUrl,
      tests: [
        {
          name: 'GET Request',
          status: getResponse.status,
          response: getResponseText,
        },
        {
          name: 'Initialize Request',
          status: initResponse.status,
          response: initResponseText,
        },
        {
          name: 'Tools List Request',
          status: toolsResponse.status,
          response: toolsResponseText,
        },
      ],
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      gatewayUrl,
    }, { status: 500 });
  }
}