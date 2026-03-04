#!/usr/bin/env node

const http = require('http');

const CLAWDWATCH_API = process.env.CLAWDWATCH_API || 'http://localhost:3444';

// MCP Protocol constants
const JSONRPC_VERSION = '2.0';

let serverInfo = {
  name: 'clawdwatch',
  version: '1.0.0'
};

function createResponse(id, result) {
  return JSON.stringify({
    jsonrpc: JSONRPC_VERSION,
    id,
    result
  });
}

function createError(id, code, message) {
  return JSON.stringify({
    jsonrpc: JSONRPC_VERSION,
    id,
    error: { code, message }
  });
}

// Read JSON-RPC requests from stdin
let buffer = '';

process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  buffer += chunk;
  
  // Try to parse complete JSON-RPC messages
  let newlineIndex;
  while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, newlineIndex);
    buffer = buffer.slice(newlineIndex + 1);
    
    if (line.trim() === '') continue;
    
    try {
      const request = JSON.parse(line);
      handleRequest(request);
    } catch (e) {
      console.error('Parse error:', e.message);
    }
  }
});

function handleRequest(request) {
  const { id, method, params } = request;
  
  // Handle initialize method (required for MCP)
  if (method === 'initialize') {
    serverInfo = {
      name: params?.protocolVersion || 'clawdwatch',
      version: '1.0.0'
    };
    const response = {
      jsonrpc: JSONRPC_VERSION,
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: serverInfo
      }
    };
    console.log(JSON.stringify(response));
    return;
  }
  
  // Handle ping
  if (method === 'ping') {
    console.log(createResponse(id, {}));
    return;
  }
  
  // Handle tools/list
  if (method === 'tools/list') {
    const response = {
      jsonrpc: JSONRPC_VERSION,
      id,
      result: {
        tools: [
          { name: 'clawdwatch_status', description: 'Get Clawdwatch service status', inputSchema: { type: 'object', properties: {} } },
          { name: 'clawdwatch_osint', description: 'Get latest OSINT data', inputSchema: { type: 'object', properties: {} } },
          { name: 'clawdwatch_conflict', description: 'Get conflict status', inputSchema: { type: 'object', properties: {} } },
          { name: 'clawdwatch_flights', description: 'Get flight tracking data', inputSchema: { type: 'object', properties: {} } },
          { name: 'clawdwatch_ships', description: 'Get ship tracking data', inputSchema: { type: 'object', properties: {} } },
          { name: 'clawdwatch_snapshot', description: 'Get OSINT snapshot', inputSchema: { type: 'object', properties: {} } },
          { name: 'clawdwatch_regions', description: 'List available regions', inputSchema: { type: 'object', properties: {} } },
        ]
      }
    };
    console.log(JSON.stringify(response));
    return;
  }
  
  // Handle tools/call
  if (method === 'tools/call') {
    const toolName = params?.name;
    let endpoint = '';
    
    switch (toolName) {
      case 'clawdwatch_status': endpoint = '/status'; break;
      case 'clawdwatch_osint': endpoint = '/osint'; break;
      case 'clawdwatch_conflict': endpoint = '/conflict'; break;
      case 'clawdwatch_flights': endpoint = '/flights'; break;
      case 'clawdwatch_ships': endpoint = '/ships'; break;
      case 'clawdwatch_snapshot': endpoint = '/snapshot'; break;
      case 'clawdwatch_regions': endpoint = '/regions'; break;
      default:
        console.log(createError(id, -32601, 'Tool not found: ' + toolName));
        return;
    }
    
    // Make HTTP request
    const url = new URL(endpoint, CLAWDWATCH_API);
    
    http.get(url.href, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const response = {
            jsonrpc: JSONRPC_VERSION,
            id,
            result: {
              content: [{ type: 'text', text: JSON.stringify(json, null, 2) }]
            }
          };
          console.log(JSON.stringify(response));
        } catch (e) {
          console.log(createError(id, -32000, 'Parse error: ' + e.message));
        }
      });
    }).on('error', (e) => {
      console.log(createError(id, -32000, e.message));
    });
    return;
  }
  
  // Unknown method
  console.log(createError(id, -32601, 'Method not found: ' + method));
}

console.error('Clawdwatch MCP Server starting...');
