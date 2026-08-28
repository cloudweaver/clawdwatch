#!/usr/bin/env node

// ClawdWatch MCP Server - stdio transport for LM Studio
// Auto-syncs with the live ClawdWatch HTTP API at startup by fetching /
// so the tool catalog always matches whatever the server exposes.
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const BASE_URL = process.env.CLAWDWATCH_URL || 'http://localhost:3444';
const TOOL_PREFIX = 'clawdwatch';

// ---------------------------------------------------------------------------
// Parse a catalog entry string into path + method + params
//   "GET /ssl/:host?port=        (TLS cert chain + expiry, free)"
//   "POST /ofac/refresh          (reload OFAC cache from OpenSanctions)"
// ---------------------------------------------------------------------------
function parseEndpoint(entry) {
  // Trim description in parens
  const stripped = entry.replace(/\s*\([^)]*\)\s*$/, '').trim();
  // Split method + rest
  const [method, ...rest] = stripped.split(/\s+/);
  const pathAndQuery = rest.join(' ');
  const [pathPart, queryPart] = pathAndQuery.split('?');

  const pathParams = [];
  const re = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;
  let m;
  while ((m = re.exec(pathPart)) !== null) pathParams.push(m[1]);

  const queryParams = [];
  if (queryPart) {
    for (const q of queryPart.split('&')) {
      const [name, defaultVal] = q.split('=');
      if (name) queryParams.push({ name, default: defaultVal ?? '' });
    }
  }

  return {
    method: (method || 'GET').toUpperCase(),
    pathTemplate: pathPart,
    pathParams,
    queryParams,
  };
}

// Build input schema properties from parsed endpoint
function buildInputSchema(parsed) {
  const props = {};
  const required = [];
  for (const p of parsed.pathParams) {
    props[p] = { type: 'string', description: `Path param: ${p}` };
    required.push(p);
  }
  for (const q of parsed.queryParams) {
    props[q.name] = {
      type: q.name === 'days' || q.name === 'hours' || q.name === 'limit' || q.name === 'min' || q.name === 'radius' || q.name === 'port' || q.name === 'lat' || q.name === 'lng' ? 'number' : 'string',
      description: `Query param: ${q.name}`,
    };
  }
  return {
    type: 'object',
    properties: props,
    ...(required.length > 0 ? { required } : {}),
  };
}

// Substitute path params and append query string
function buildUrl(template, args = {}, queryDefaults = []) {
  let path = template;
  for (const [k, v] of Object.entries(args)) {
    path = path.replace(`:${k}`, encodeURIComponent(String(v)));
  }
  const qp = new URLSearchParams();
  for (const q of queryDefaults) {
    if (args[q.name] !== undefined && args[q.name] !== '') {
      qp.set(q.name, String(args[q.name]));
    } else if (q.default) {
      qp.set(q.name, q.default);
    }
  }
  const qs = qp.toString();
  return qs ? `${BASE_URL}${path}?${qs}` : `${BASE_URL}${path}`;
}

// ---------------------------------------------------------------------------
// Fetch the live catalog and build tool list
// ---------------------------------------------------------------------------
async function fetchCatalog() {
  try {
    const r = await fetch(`${BASE_URL}/`, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    return data.endpoints || {};
  } catch (e) {
    console.error(`[clawdwatch-mcp] failed to fetch catalog from ${BASE_URL}: ${e.message}`);
    return {};
  }
}

function buildTools(catalog) {
  const tools = [];
  for (const [key, entry] of Object.entries(catalog)) {
    const parsed = parseEndpoint(entry);
    tools.push({
      name: `${TOOL_PREFIX}_${key}`,
      description: `${parsed.method} ${parsed.pathTemplate}${parsed.queryParams.length ? '?' + parsed.queryParams.map(q => q.name + (q.default ? '=' + q.default : '')).join('&') : ''}`,
      inputSchema: buildInputSchema(parsed),
      _parsed: parsed,
    });
  }
  return tools;
}

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------
const server = new Server({
  name: 'clawdwatch',
  version: '2.5.0-lobster'
}, {
  capabilities: { tools: {} }
});

let tools = [];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  // Strip internal _parsed before returning to clients
  return { tools: tools.map(({ _parsed, ...rest }) => rest) };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const tool = tools.find(t => t.name === name);
  if (!tool) {
    return { content: [{ type: 'text', text: `Unknown tool: ${name}. Run tools/list to see available tools.` }] };
  }
  try {
    const url = buildUrl(tool._parsed.pathTemplate, args, tool._parsed.queryParams);
    const fetchOpts = { signal: AbortSignal.timeout(15000) };
    if (tool._parsed.method === 'POST') {
      fetchOpts.method = 'POST';
      fetchOpts.headers = { 'Content-Type': 'application/json' };
    }
    const r = await fetch(url, fetchOpts);
    const text = await r.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          ok: r.ok,
          status: r.status,
          url,
          method: tool._parsed.method,
          data: body,
        }, null, 2),
      }],
    };
  } catch (e) {
    return { content: [{ type: 'text', text: `Error calling ${name}: ${e.message}` }] };
  }
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
console.error(`[clawdwatch-mcp] fetching catalog from ${BASE_URL}/ ...`);
const catalog = await fetchCatalog();
tools = buildTools(catalog);
console.error(`[clawdwatch-mcp] loaded ${tools.length} tools:`);
for (const t of tools) {
  console.error(`  - ${t.name}  ${t._parsed.method} ${t._parsed.pathTemplate}`);
}

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('[clawdwatch-mcp] running on stdio');
