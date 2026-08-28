#!/usr/bin/env node
/**
 * ClawdWatch Lobster Edition — Endpoint test harness
 *
 * Hits every endpoint, asserts HTTP 200 + valid JSON + reasonable response time.
 * Used as a smoke test before/after each integration commit.
 *
 * Usage:
 *   1. Start server in another terminal: npx ts-node src/http.ts
 *   2. node scripts/test-endpoints.js
 *
 * Exit codes:
 *   0 = all green
 *   1 = any endpoint failed
 */
const http = require('http');

const HOST = process.env.LOBSTER_HOST || 'localhost';
const PORT = process.env.LOBSTER_PORT || 3444;
const TIMEOUT_MS = 60_000;

// Endpoint catalog: [path, max_expected_seconds, optional: skip]
const ENDPOINTS = [
  // Core
  ['/', 5],
  ['/status', 5],
  ['/regions', 5],

  // News
  ['/news/sources', 5],
  ['/news/health', 5],
  ['/news', 30],
  ['/news/world', 30],

  // Flights
  // OpenSky enforces a 10s request interval; retries can make these take ~45s.
  ['/flights', 60],
  ['/flights/global', 60],
  ['/flights/japan', 60],

  // Intel
  ['/earthquakes', 15],
  // GDACS can take ~20s when its upstream feed is slow, while still returning valid JSON.
  ['/gdacs', 30],
  ['/weather/us', 15],
  ['/weather?lat=40.7128&lon=-74.0060', 15],
  ['/defcon', 5],
  ['/defcon/score', 5],
  ['/conflict', 60],
  ['/osint', 60],
  ['/snapshot', 60],

  // OSIRIS-integrated endpoints
  // (some require free API keys — see .env.example)
  ['/dns/github.com', 15],                                 // works (Google DoH, no key)
  ['/whois/github.com', 15],                               // works (RDAP, no key)
  ['/crypto/btc/1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', 15],  // works (blockstream, no key)
  ['/crypto/eth/0xd8da6bf26964af9d7eed9e03e53415d37aa96045', 15], // works (Blockscout, no key)
  ['/cve/CVE-2021-44228', 15],                            // works (NVD, no key) — Log4Shell
  ['/cve/recent?days=7', 30],                              // works (NVD, no key)
  ['/telegram/durov?limit=3', 15],                         // works (t.me scraping, no key)
  ['/space-weather', 15],                                  // works (NOAA SWPC, no key)
  ['/sentinel?lat=39.7589&lng=-84.1916&radius=2&days=30', 20],  // works (Element84 STAC, no key)
  ['/satellites?category=stations&limit=3', 20],            // works (Celestrak, no key)
  ['/cyber-threats?days=60', 30],                          // works (CISA KEV, no key)
  ['/geo?ip=8.8.8.8', 15],                                 // works (3-provider cascade, no key)
  ['/air-quality', 30],                                    // works (Open-Meteo, no key)
  // RECON toolkit additions
  ['/ssl/github.com', 15],                                 // works (Node tls module, no key)
  ['/news/live', 5],                                       // works (static feed catalog, no key)
  ['/ofac/check?q=test', 5],                               // works (no key, returns null gracefully)
  ['/scan?host=github.com', 5],                            // disabled by default (PORT_SCAN_ENABLED=false)
  // needs API key — gracefully 404s without one
  ['/sanctions?q=Putin', 15],                              // needs OPENSANCTIONS_API_KEY
  ['/fires?hours=24', 30],                                 // needs FIRMS_MAP_KEY
];

// Include the one registered POST route in the same end-to-end report.
const REQUESTS = [
  ...ENDPOINTS.map(([path, maxSeconds]) => ['GET', path, maxSeconds]),
  ['POST', '/ofac/refresh', 15],                            // no-op without an OpenSanctions key
];

function hit(method, path) {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = http.request(
      { host: HOST, port: PORT, path, method, timeout: TIMEOUT_MS },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          const elapsed = (Date.now() - start) / 1000;
          let parsed = null;
          let parseErr = null;
          try { parsed = JSON.parse(body); } catch (e) { parseErr = e.message; }
          resolve({
            path,
            status: res.statusCode,
            bytes: body.length,
            elapsed: elapsed.toFixed(2),
            isJson: parsed !== null,
            parseErr,
            topKeys: parsed && typeof parsed === 'object' ? Object.keys(parsed).slice(0, 5) : null,
          });
        });
      }
    );
    req.on('timeout', () => {
      req.destroy();
      resolve({ path, status: 'TIMEOUT', bytes: 0, elapsed: TIMEOUT_MS / 1000, isJson: false, parseErr: 'timeout' });
    });
    req.on('error', (e) => {
      resolve({ path, status: 'ERROR', bytes: 0, elapsed: 0, isJson: false, parseErr: e.message });
    });
    req.end();
  });
}

(async () => {
  console.log(`🦀 ClawdWatch Lobster Edition — endpoint test harness`);
  console.log(`   Target: http://${HOST}:${PORT}`);
  console.log(`   Endpoints: ${REQUESTS.length}`);
  console.log();

  const results = [];
  for (const [method, path, maxSeconds] of REQUESTS) {
    process.stdout.write(`  ${path.padEnd(28)} ... `);
    const r = await hit(method, path);
    results.push(r);
    const ok =
      r.status === 200 &&
      r.isJson &&
      parseFloat(r.elapsed) <= maxSeconds;
    results[results.length - 1] = { ...r, ok };
    if (ok) {
      console.log(`✓ HTTP 200  (${r.bytes}b, ${r.elapsed}s)`);
    } else {
      console.log(`✗ HTTP ${r.status}  (${r.bytes}b, ${r.elapsed}s) ${r.parseErr ? '[' + r.parseErr + ']' : ''}`);
      if (r.topKeys) console.log(`    keys: ${r.topKeys.join(', ')}`);
    }
  }

  console.log();
  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  console.log(`Result: ${passed} passed, ${failed} failed of ${results.length}`);

  // Show slowest 3
  const slowest = [...results].sort((a, b) => parseFloat(b.elapsed) - parseFloat(a.elapsed)).slice(0, 3);
  console.log();
  console.log('Slowest endpoints:');
  for (const r of slowest) {
    console.log(`  ${r.path.padEnd(28)} ${r.elapsed}s`);
  }

  process.exit(failed > 0 ? 1 : 0);
})();
