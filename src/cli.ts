#!/usr/bin/env node
/**
 * ClawdWatch CLI — reads from the local HTTP API (default http://localhost:3444).
 *
 * This file is intentionally thin: all data flow goes through the public HTTP
 * routes, so the CLI cannot drift from the server. The HTTP server is the
 * single source of truth.
 *
 * Usage:
 *   npm run regions                       # list all regions
 *   npm run snapshot                      # full global snapshot
 *   clawdwatch --base http://host:3444 regions
 *   clawdwatch regions --group asia
 *   clawdwatch snapshot --region israel
 *   clawdwatch snapshot --region usa --json
 *   clawdwatch status                     # server health
 *   clawdwatch help
 */

import axios, { AxiosInstance } from 'axios';

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------

const HELP = `
🦀 ClawdWatch CLI

Usage:
  clawdwatch <command> [options]

Commands:
  regions       List all known regions (with bounds and group)
  snapshot      Pull a live snapshot from one or more regions
  status        Server health + version
  help          Show this help

Options:
  --base URL       HTTP base (default: ${process.env.CLAWDWATCH_BASE || 'http://localhost:3444'})
  --region ID      Region id (repeatable: --region usa --region israel)
  --group G        Filter regions by group (e.g. middle_east, asia, africa)
  --json           Emit raw JSON instead of pretty output
  --timeout MS     Request timeout (default 30000)

Examples:
  clawdwatch regions
  clawdwatch regions --group africa
  clawdwatch snapshot --region israel
  clawdwatch snapshot --region usa --region iran --json
  clawdwatch --base http://100.64.1.10:3444 status
`;

interface CliOptions {
  base: string;
  command: string;
  region: string[];
  group?: string;
  json: boolean;
  timeout: number;
}

function parseArgs(argv: string[]): CliOptions {
  const out: CliOptions = {
    base: process.env.CLAWDWATCH_BASE || 'http://localhost:3444',
    command: '',
    region: [],
    json: false,
    timeout: 30_000,
  };

  let i = 0;
  if (argv.length > 0 && !argv[0].startsWith('-')) {
    out.command = argv[0];
    i = 1;
  }
  while (i < argv.length) {
    const tok = argv[i];
    switch (tok) {
      case '-h':
      case '--help':
        out.command = 'help';
        i++;
        break;
      case '--base': {
        const v = argv[++i];
        if (!v) throw new Error('--base requires a URL');
        out.base = v.replace(/\/+$/, '');
        i++;
        break;
      }
      case '--region': {
        const v = argv[++i];
        if (!v) throw new Error('--region requires an id');
        out.region.push(v);
        i++;
        break;
      }
      case '--group': {
        const v = argv[++i];
        if (!v) throw new Error('--group requires a value');
        out.group = v;
        i++;
        break;
      }
      case '--json':
        out.json = true;
        i++;
        break;
      case '--timeout': {
        const v = argv[++i];
        const n = Number(v);
        if (!Number.isFinite(n) || n <= 0) throw new Error('--timeout must be a positive number');
        out.timeout = n;
        i++;
        break;
      }
      default:
        throw new Error(`Unknown argument: ${tok}`);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// HTTP client
// ---------------------------------------------------------------------------

function makeClient(opts: CliOptions): AxiosInstance {
  return axios.create({
    baseURL: opts.base,
    timeout: opts.timeout,
    validateStatus: () => true, // we handle non-2xx ourselves
    headers: { 'user-agent': 'clawdwatch-cli/2.5.0' },
  });
}

async function call<T = any>(http: AxiosInstance, path: string, params?: Record<string, any>): Promise<T> {
  const res = await http.get<T>(path, { params });
  if (res.status >= 400) {
    const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    throw new Error(`${res.status} ${res.statusText} for ${path}: ${body.slice(0, 240)}`);
  }
  return res.data;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

interface RegionRow {
  id: string;
  name: string;
  description: string;
  group: string;
  priority: number;
  aliases: string[];
  bounds: { latMin: number; latMax: number; lonMin: number; lonMax: number };
}

function pad(s: string, n: number): string {
  if (s.length >= n) return s.slice(0, n - 1) + '…';
  return s + ' '.repeat(n - s.length);
}

async function cmdRegions(http: AxiosInstance, opts: CliOptions): Promise<number> {
  const data = await call<{ regions: RegionRow[] }>(http, '/regions');
  let rows = data.regions;
  if (opts.group) rows = rows.filter((r) => r.group === opts.group);

  if (opts.json) {
    console.log(JSON.stringify(rows, null, 2));
    return 0;
  }

  if (rows.length === 0) {
    console.log(`No regions matched${opts.group ? ` group="${opts.group}"` : ''}.`);
    return 0;
  }

  console.log(`🦀 ${rows.length} region${rows.length === 1 ? '' : 's'}${opts.group ? ` (group: ${opts.group})` : ''}:`);
  console.log('');
  console.log(`${pad('ID', 22)} ${pad('NAME', 26)} ${pad('GROUP', 14)} ${pad('PRIO', 4)} BOUNDS`);
  console.log('-'.repeat(98));
  for (const r of rows) {
    const b = r.bounds;
    const bounds = `${b.latMin.toFixed(0)}..${b.latMax.toFixed(0)} / ${b.lonMin.toFixed(0)}..${b.lonMax.toFixed(0)}`;
    console.log(`${pad(r.id, 22)} ${pad(r.name, 26)} ${pad(r.group, 14)} ${pad(String(r.priority), 4)} ${bounds}`);
    if (r.aliases.length) {
      console.log(`  ${' '.repeat(22)} aliases: ${r.aliases.join(', ')}`);
    }
  }
  return 0;
}

async function cmdSnapshot(http: AxiosInstance, opts: CliOptions): Promise<number> {
  const regions = opts.region.length ? opts.region : ['global'];
  const path = '/snapshot';
  const params = regions.length === 1 ? { region: regions[0] } : { region: regions.join(',') };
  const data = await call<any>(http, path, params);

  if (opts.json) {
    console.log(JSON.stringify(data, null, 2));
    return 0;
  }

  console.log(`🦀 ClawdWatch snapshot`);
  console.log(`   base:    ${opts.base}`);
  console.log(`   regions: ${regions.join(', ')}`);
  console.log(`   at:      ${data?.generatedAt || new Date().toISOString()}`);
  console.log('');
  console.log(JSON.stringify(data, null, 2));
  return 0;
}

async function cmdStatus(http: AxiosInstance, opts: CliOptions): Promise<number> {
  const data = await call<any>(http, '/status');
  if (opts.json) {
    console.log(JSON.stringify(data, null, 2));
    return 0;
  }
  console.log(`🦀 ClawdWatch status`);
  console.log(`   base:    ${opts.base}`);
  console.log(JSON.stringify(data, null, 2));
  return 0;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<number> {
  let opts: CliOptions;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e: any) {
    console.error(`Error: ${e.message}`);
    console.error(HELP);
    return 2;
  }

  if (!opts.command || opts.command === 'help' || opts.command === '-h' || opts.command === '--help') {
    console.log(HELP);
    return 0;
  }

  const http = makeClient(opts);
  try {
    switch (opts.command) {
      case 'regions':
        return await cmdRegions(http, opts);
      case 'snapshot':
        return await cmdSnapshot(http, opts);
      case 'status':
        return await cmdStatus(http, opts);
      default:
        console.error(`Unknown command: ${opts.command}`);
        console.error(HELP);
        return 2;
    }
  } catch (e: any) {
    console.error(`✗ ${e.message}`);
    return 1;
  }
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error('Unhandled error:', e);
    process.exit(1);
  },
);
