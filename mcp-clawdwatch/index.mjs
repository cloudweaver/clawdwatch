#!/usr/bin/env node

// ClawdWatch MCP Server - stdio transport for LM Studio
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const server = new Server({
  name: 'clawdwatch',
  version: '1.0.0'
}, {
  capabilities: {
    tools: {}
  }
});

const tools = [
  {
    name: 'clawdwatch_status',
    description: 'Get ClawdWatch service status',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'clawdwatch_flights',
    description: 'Get flight data from conflict regions',
    inputSchema: { 
      type: 'object', 
      properties: { 
        region: { type: 'string', description: 'Optional region name' }
      }
    }
  },
  {
    name: 'clawdwatch_flight',
    description: 'Get flight data from conflict regions (alias for flights)',
    inputSchema: { 
      type: 'object', 
      properties: { 
        region: { type: 'string', description: 'Optional region name' }
      }
    }
  },
  {
    name: 'clawdwatch_osint',
    description: 'Get combined OSINT data (flights + news)',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'clawdwatch_news',
    description: 'Get news from Reuters, Al Jazeera, AP',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'clawdwatch_conflict',
    description: 'Get conflict zone summary data (cached)',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'clawdwatch_regions',
    description: 'List all 21 tracked regions',
    inputSchema: { type: 'object', properties: {} }
  }
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    const baseUrl = 'http://localhost:3444';
    let data;
    
    switch (name) {
      case 'clawdwatch_status':
        data = await fetch(`${baseUrl}/status`, { signal: AbortSignal.timeout(5000) }).then(r => r.json());
        break;
      case 'clawdwatch_flights':
      case 'clawdwatch_flight':
        data = args.region 
          ? await fetch(`${baseUrl}/flights/${args.region}`, { signal: AbortSignal.timeout(5000) }).then(r => r.json())
          : await fetch(`${baseUrl}/flights`, { signal: AbortSignal.timeout(5000) }).then(r => r.json());
        break;
      case 'clawdwatch_osint':
        data = await fetch(`${baseUrl}/osint`, { signal: AbortSignal.timeout(5000) }).then(r => r.json());
        break;
      case 'clawdwatch_news':
        data = await fetch(`${baseUrl}/news`, { signal: AbortSignal.timeout(5000) }).then(r => r.json());
        break;
      case 'clawdwatch_conflict':
        data = await fetch(`${baseUrl}/conflict`, { signal: AbortSignal.timeout(5000) }).then(r => r.json());
        break;
      case 'clawdwatch_regions':
        data = await fetch(`${baseUrl}/regions`, { signal: AbortSignal.timeout(5000) }).then(r => r.json());
        break;
      default:
        return { content: [{ type: 'text', text: 'Unknown tool' }] };
    }
    
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('ClawdWatch MCP server running');
