import express from 'express';
import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

import { ALL_REGIONS, getDefaultFlightRegions, getRegionById, findRegion, type RegionDefinition } from './regions';
import { RSS_FEEDS, fetchFeed, fetchFeeds, getFeedHealth, type NewsItem, type RssFeed, type FeedHealth } from './sources/rss';
import { fetchEarthquakes, fetchUsWeatherAlerts, fetchCurrentWeather, fetchGdacsEvents, fetchDefconLevel } from './sources/intel';
import {
  searchSanctions,
  traceBtcAddress,
  traceEthAddress,
  fetchFireHotspots,
  fetchCve,
  fetchRecentCves,
  whoisLookup,
  dnsLookup,
  fetchTelegramChannel,
  fetchSpaceWeather,
  searchSentinelScenes,
  fetchSatelliteCatalog,
  fetchCyberThreats,
  geoLocate,
  fetchAirQuality,
  inspectTlsCertificate,
  fetchLiveNewsFeeds,
  refreshOfacCache,
  checkOfac,
  ofacCacheSize,
  scanPorts,
} from './sources/osiris';

const app = express();
const PORT = 3444;

// ============================================================
// OpenSky rate limiting + cache
// ============================================================
const OPENSKY_BASE = 'https://opensky-network.org/api/states/all';
const OPENSKY_KEY = process.env.OPENSKY_API_KEY || '';
const OPENSKY_AUTH_HEADER = OPENSKY_KEY ? { 'Authorization': `Bearer ${OPENSKY_KEY}` } : {};

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 10_000;   // 10s — strict enough to be polite
const MAX_RETRIES = 2;
const RETRY_DELAY = 15_000;

const cache: { [key: string]: { data: any; timestamp: number } } = {};
const CACHE_TTL = 5 * 60 * 1000;       // 5 min for flight data

async function fetchOpenSky(url: string, useCache = true): Promise<any> {
  const cacheKey = url;

  if (useCache && cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < CACHE_TTL) {
    return cache[cacheKey].data;
  }

  // rate limit
  const now = Date.now();
  const wait = MIN_REQUEST_INTERVAL - (now - lastRequestTime);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestTime = Date.now();

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await axios.get(url, {
        headers: { ...OPENSKY_AUTH_HEADER, 'User-Agent': 'ClawdWatch-Lobster/1.0' },
        timeout: 15_000,
        validateStatus: () => true,
      });

      if (response.status === 429) {
        console.warn(`[opensky] rate limited, retrying in ${RETRY_DELAY}ms`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY));
        continue;
      }

      if (response.status >= 400) {
        return { error: `OpenSky HTTP ${response.status}`, states: [] };
      }

      if (response.data?.states) {
        cache[cacheKey] = { data: response.data, timestamp: Date.now() };
        return response.data;
      }

      return { states: [] };
    } catch (e: any) {
      if (attempt === MAX_RETRIES - 1) {
        return { error: e.message, states: [] };
      }
    }
  }
  return { error: 'OpenSky: max retries exceeded', states: [] };
}

// ============================================================
// Flight region fetcher
// ============================================================
async function getFlightsForRegion(region: RegionDefinition) {
  const { flightBounds, name, id } = region;
  const url = `${OPENSKY_BASE}?lamin=${flightBounds.latMin}&lomin=${flightBounds.lonMin}&lamax=${flightBounds.latMax}&lomax=${flightBounds.lonMax}`;
  const data = await fetchOpenSky(url);

  if (data.error) {
    return { regionId: id, region: name, total: 0, flights: [], error: data.error };
  }
  return {
    regionId: id,
    region: name,
    group: region.group,
    total: data.states?.length || 0,
    flights: (data.states || []).slice(0, 50),
  };
}

// Aggregate flight counts across many regions. Designed to be cache-friendly.
async function getFlightSummary(regions: RegionDefinition[]) {
  const results = await Promise.all(regions.map(getFlightsForRegion));
  const totalFlights = results.reduce((s, r) => s + (r.total || 0), 0);
  const errors = results.filter((r) => r.error);
  return {
    timestamp: new Date().toISOString(),
    source: 'OpenSky Network',
    regionsQueried: regions.length,
    totalFlights,
    regions: results.map((r) => ({
      id: r.regionId,
      name: r.region,
      group: (regions.find((reg) => reg.id === r.regionId))?.group,
      flights: r.total,
      error: r.error,
    })),
    degraded: errors.length > 0,
  };
}

// ============================================================
// CORS
// ============================================================
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ============================================================
// ROUTES
// ============================================================

app.get('/', (req, res) => {
  res.json({
    service: 'clawdwatch-lobster-edition',
    version: '2.5.0-lobster',
    description: 'Global OSINT aggregator — flights, news, disasters, weather, DEFCON, sanctions, crypto, fires, CVEs, WHOIS, DNS, Telegram',
    endpoints: {
      status:       'GET /status',
      regions:      'GET /regions',
      flights:      'GET /flights               (priority regions)',
      flightsRegion:'GET /flights/:region       (single region by id or alias)',
      flightsAll:   'GET /flights/all           (every defined region, slower)',
      news:         'GET /news                  (all enabled RSS feeds)',
      newsRegion:   'GET /news/:region          (filter by region group)',
      newsHealth:   'GET /news/health           (per-source health)',
      newsSources:  'GET /news/sources          (configured RSS feeds)',
      earthquakes:  'GET /earthquakes?min=4.0   (USGS, 2.5+ last 24h)',
      gdacs:        'GET /gdacs                 (global disaster alerts)',
      weatherAlerts:'GET /weather/us            (NWS active US alerts)',
      weather:      'GET /weather?lat=&lon=     (current wx from Open-Meteo)',
      defcon:       'GET /defcon                (current DEFCON level from defconlevel.com)',
      defconScore:  'GET /defcon/score          (numeric DEFCON score for dashboards)',
      conflict:     'GET /conflict              (ME-focused legacy summary)',
      osint:        'GET /osint                 (global situational summary)',
      snapshot:     'GET /snapshot              (one-call daily brief)',
      // OSIRIS-derived endpoints (v2.2)
      sanctions:    'GET /sanctions?q=<name>     (OFAC SDN + OpenSanctions person/org/vessel)',
      cryptoBtc:    'GET /crypto/btc/:address    (BTC wallet trace via blockstream.info)',
      cryptoEth:    'GET /crypto/eth/:address    (ETH wallet trace via Blockscout)',
      fires:        'GET /fires?hours=24&region= (NASA FIRMS active fire hotspots)',
      cve:          'GET /cve/:id                (NVD CVE detail, e.g. CVE-2024-12345)',
      cveRecent:    'GET /cve/recent?days=7      (recently modified CVEs)',
      whois:        'GET /whois/:domain          (RDAP lookup, free, no key)',
      dns:          'GET /dns/:domain            (A, AAAA, MX, TXT, NS, CNAME via Google DoH)',
      telegram:     'GET /telegram/:channel      (public channel recent messages)',
      spaceWeather: 'GET /space-weather          (NOAA SWPC Kp index + solar flares, free, no key)',
      sentinel:     'GET /sentinel?lat=&lng=     (Sentinel-1/2 satellite imagery search, free)',
      satellites:   'GET /satellites?category=   (Celestrak TLE catalog, free)',
      cyberThreats: 'GET /cyber-threats?days=    (CISA Known Exploited Vulnerabilities, free)',
      geo:          'GET /geo?ip=                (IP geolocation, 3-provider cascade)',
      airQuality:   'GET /air-quality?limit=     (OpenAQ global PM2.5 stations, free)',
      sslInspect:   'GET /ssl/:host?port=        (TLS cert chain + expiry, free)',
      liveNews:     'GET /news/live?category=    (15+ global 24/7 broadcasters)',
      ofacCheck:    'GET /ofac/check?q=          (OFAC auto-flag; needs API key)',
      ofacRefresh:  'POST /ofac/refresh          (reload OFAC cache from OpenSanctions)',
      scan:         'GET /scan?host=&ports=      (TCP port scanner; PORT_SCAN_ENABLED=true)',
    },
  });
});

app.get('/status', (req, res) => {
  res.json({
    status: 'running',
    service: 'clawdwatch-lobster-edition',
    port: PORT,
    version: '2.5.0-lobster',
    regions: ALL_REGIONS.length,
    newsFeeds: RSS_FEEDS.filter((f) => f.enabled).length,
    cacheActive: true,
    timestamp: new Date().toISOString(),
  });
});

app.get('/regions', (req, res) => {
  res.json({
    total: ALL_REGIONS.length,
    regions: ALL_REGIONS.map((r) => ({
      id: r.id,
      name: r.name,
      group: r.group,
      description: r.description,
      bounds: r.flightBounds,
      aliases: r.aliases,
      priority: r.priority,
    })),
  });
});

// === FLIGHTS ===
app.get('/flights', async (req, res) => {
  const summary = await getFlightSummary(getDefaultFlightRegions());
  res.json({
    ...summary,
    // Keep flights in default for backward compat
    flights: summary.regions.flatMap((r) => []).slice(0, 0), // intentionally empty; use /flights/:region
    note: 'This endpoint returns aggregate counts. For raw flight lists, call /flights/:region.',
  });
});

app.get('/flights/all', async (req, res) => {
  const summary = await getFlightSummary(ALL_REGIONS);
  res.json(summary);
});

app.get('/flights/:region', async (req, res) => {
  const region = findRegion(req.params.region);
  if (!region) {
    return res.status(404).json({ error: `Unknown region: ${req.params.region}. Try /regions.` });
  }
  const result = await getFlightsForRegion(region);
  res.json({
    timestamp: new Date().toISOString(),
    source: 'OpenSky Network',
    ...result,
  });
});

// === NEWS (RSS) ===
// === NEWS (RSS) — specific routes BEFORE /news/:region ===
app.get('/news/health', (req, res) => {
  const health: FeedHealth[] = getFeedHealth();
  const configured = RSS_FEEDS.filter((f) => f.enabled).length;
  res.json({
    timestamp: new Date().toISOString(),
    configured,
    fetched: health.length,
    pending: Math.max(configured - health.length, 0),
    ok: health.filter((h) => h.ok).length,
    failing: health.filter((h) => !h.ok).length,
    feeds: health,
  });
});

app.get('/news/sources', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    total: RSS_FEEDS.length,
    enabled: RSS_FEEDS.filter((f) => f.enabled).length,
    feeds: RSS_FEEDS.map((f) => ({
      id: f.id,
      name: f.name,
      region: f.region,
      feedUrl: f.feedUrl,
      enabled: f.enabled,
      weight: f.weight,
    })),
  });
});

app.get('/news', async (req, res) => {
  const all = await fetchFeeds(RSS_FEEDS, true);
  // Dedupe by URL
  const seen = new Set<string>();
  const deduped = all.filter((n) => {
    if (seen.has(n.url)) return false;
    seen.add(n.url);
    return true;
  });
  // Newest first
  deduped.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  res.json({
    timestamp: new Date().toISOString(),
    sourcesCount: RSS_FEEDS.filter((f) => f.enabled).length,
    total: deduped.length,
    news: deduped.slice(0, 50),
  });
});

// GET /news/live — Live broadcast network catalog (must be before /news/:region!)
// Query: ?category=mainstream|government|finance|state
app.get('/news/live', async (req, res) => {
  const category = req.query.category ? String(req.query.category) : undefined;
  const feeds = await fetchLiveNewsFeeds(category);
  res.json({
    total: feeds.length,
    embeddable: feeds.filter(f => f.embed_allowed).length,
    categories: ['mainstream', 'government', 'finance', 'state'],
    feeds,
    timestamp: new Date().toISOString(),
  });
});

app.get('/news/:region', async (req, res) => {
  const regionParam = req.params.region.toLowerCase();
  const matchingFeeds = RSS_FEEDS.filter(
    (f) => f.region === regionParam || f.id === regionParam,
  );
  if (matchingFeeds.length === 0) {
    return res.status(404).json({
      error: `No RSS feeds for region "${regionParam}".`,
      available: Array.from(new Set(RSS_FEEDS.map((f) => f.region))),
    });
  }
  const all = await fetchFeeds(matchingFeeds, true);
  const seen = new Set<string>();
  const deduped = all.filter((n) => {
    if (seen.has(n.url)) return false;
    seen.add(n.url);
    return true;
  });
  deduped.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  res.json({
    timestamp: new Date().toISOString(),
    region: regionParam,
    sources: matchingFeeds.map((f) => f.name),
    total: deduped.length,
    news: deduped.slice(0, 30),
  });
});

// === INTEL (Earthquakes, Disasters, Weather) ===
app.get('/earthquakes', async (req, res) => {
  const min = parseFloat((req.query.min as string) || '4.0');
  const quakes = await fetchEarthquakes(min);
  res.json({
    timestamp: new Date().toISOString(),
    source: 'USGS',
    minMagnitude: min,
    total: quakes.length,
    earthquakes: quakes.slice(0, 50),
  });
});

app.get('/gdacs', async (req, res) => {
  const events = await fetchGdacsEvents();
  res.json({
    timestamp: new Date().toISOString(),
    source: 'GDACS',
    total: events.length,
    events,
  });
});

app.get('/weather/us', async (req, res) => {
  const alerts = await fetchUsWeatherAlerts();
  res.json({
    timestamp: new Date().toISOString(),
    source: 'NOAA NWS',
    total: alerts.length,
    alerts,
  });
});

app.get('/weather', async (req, res) => {
  const lat = parseFloat(req.query.lat as string);
  const lon = parseFloat(req.query.lon as string);
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return res.status(400).json({ error: 'Provide ?lat=<num>&lon=<num>' });
  }
  const current = await fetchCurrentWeather(lat, lon);
  if (!current) {
    return res.status(502).json({ error: 'Weather source unavailable' });
  }
  res.json({
    timestamp: new Date().toISOString(),
    source: 'Open-Meteo',
    lat, lon,
    current,
  });
});

// === DEFCON ===
// GET /defcon — full enriched DEFCON response with threat score + thresholds
app.get('/defcon', async (req, res) => {
  const status = await fetchDefconLevel();
  if (!status) {
    return res.status(502).json({ error: 'DEFCON source unavailable' });
  }
  res.json({
    ...status,
    // Enrich with threat level classification and threshold reference
    threatLevel:
      status.level === 1 ? 'CRITICAL'
      : status.level === 2 ? 'HIGH'
      : status.level === 3 ? 'ELEVATED'
      : status.level === 4 ? 'GUARDED'
      : 'LOW',
    thresholds: {
      1: { score: 100, label: 'CRITICAL', description: 'Maximum readiness. Nuclear war imminent or in progress.' },
      2: { score: 75,  label: 'HIGH',      description: 'Armed forces mobilized. Direct military threat.' },
      3: { score: 50,  label: 'ELEVATED',  description: 'Terrorist attack possible. Air Force ready in 15 min.' },
      4: { score: 25,  label: 'GUARDED',   description: 'Above normal readiness. Heightened vigilance.' },
      5: { score: 0,   label: 'LOW',       description: 'Normal peacetime readiness. No imminent threat.' },
    },
  });
});

// GET /defcon/score — lightweight numeric-only response (good for dashboards/grafana)
app.get('/defcon/score', async (req, res) => {
  const status = await fetchDefconLevel();
  if (!status) {
    return res.status(502).json({ error: 'DEFCON source unavailable' });
  }
  res.json({
    level: status.level,
    score: status.threatScore,
    levelLabel:
      status.level === 1 ? 'CRITICAL'
      : status.level === 2 ? 'HIGH'
      : status.level === 3 ? 'ELEVATED'
      : status.level === 4 ? 'GUARDED'
      : 'LOW',
    timestamp: status.fetchedAt,
    source: status.source,
  });
});

// === AGGREGATES ===
app.get('/conflict', async (req, res) => {
  // Legacy ME-focused endpoint, kept for backward compat with the evening brief.
  const meRegionIds = ['iran', 'israel', 'lebanon', 'syria', 'iraq', 'yemen', 'saudi_arabia', 'uae', 'qatar', 'kuwait', 'turkey'];
  const conflictRegions = meRegionIds
    .map((id) => getRegionById(id))
    .filter((r): r is RegionDefinition => !!r);

  const flightResults = await Promise.all(conflictRegions.map(getFlightsForRegion));
  const newsFeeds = RSS_FEEDS.filter((f) => f.region === 'middle_east' || f.region === 'israel' || f.region === 'eastern_europe');
  const news = await fetchFeeds(newsFeeds);
  const seen = new Set<string>();
  const dedupedNews = news.filter((n) => {
    if (seen.has(n.url)) return false;
    seen.add(n.url);
    return true;
  });

  res.json({
    timestamp: new Date().toISOString(),
    source: 'OpenSky + RSS',
    conflictZones: flightResults.map((r) => ({ id: r.regionId, name: r.region, flights: r.total })),
    totalConflictFlights: flightResults.reduce((s, r) => s + (r.total || 0), 0),
    news: { total: dedupedNews.length, sources: newsFeeds.map((f) => f.name), latest: dedupedNews.slice(0, 10) },
  });
});

app.get('/osint', async (req, res) => {
  // Global situational summary. This is the one for the daily brief.
  const [flightSummary, quakes, gdacs, usWeather, defcon] = await Promise.all([
    getFlightSummary(getDefaultFlightRegions()),
    fetchEarthquakes(4.5),
    fetchGdacsEvents(),
    fetchUsWeatherAlerts(),
    fetchDefconLevel(),
  ]);

  // Pull top news from global RSS feeds (priority weight 1-2)
  const topFeeds = RSS_FEEDS.filter((f) => f.enabled && f.weight <= 2);
  const topNews = await fetchFeeds(topFeeds);
  const seen = new Set<string>();
  const dedupedNews = topNews
    .filter((n) => { if (seen.has(n.url)) return false; seen.add(n.url); return true; })
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 20);

  res.json({
    timestamp: new Date().toISOString(),
    summary: {
      defcon: defcon?.level ?? null,
      defconDescription: defcon?.description ?? null,
      flights: flightSummary.totalFlights,
      regionsTracked: flightSummary.regionsQueried,
      earthquakes45: quakes.length,
      gdacsEvents: gdacs.length,
      usWeatherAlerts: usWeather.length,
      newsHeadlines: dedupedNews.length,
    },
    defcon,
    flights: flightSummary,
    earthquakes: quakes.slice(0, 10),
    disasters: gdacs.slice(0, 10),
    weather: usWeather.slice(0, 10),
    news: dedupedNews,
  });
});

app.get('/snapshot', async (req, res) => {
  // One-call daily brief. Cheap version of /osint.
  const [flightSummary, quakes, defcon] = await Promise.all([
    getFlightSummary(getDefaultFlightRegions()),
    fetchEarthquakes(5.0),
    fetchDefconLevel(),
  ]);
  const topFeeds = RSS_FEEDS.filter((f) => f.enabled && f.weight <= 2);
  const topNews = await fetchFeeds(topFeeds);
  const seen = new Set<string>();
  const dedupedNews = topNews
    .filter((n) => { if (seen.has(n.url)) return false; seen.add(n.url); return true; })
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 8);

  res.json({
    timestamp: new Date().toISOString(),
    version: '2.5.0-lobster',
    defcon,
    flights: {
      total: flightSummary.totalFlights,
      byRegion: flightSummary.regions.map((r) => ({ name: r.name, flights: r.flights })),
    },
    earthquakes: { total: quakes.length, top: quakes.slice(0, 3) },
    news: { total: dedupedNews.length, top: dedupedNews },
  });
});

// ============================================================
// OSIRIS-derived endpoints (Phase 1: intel)
// ============================================================

// GET /sanctions?q=<name> — OFAC SDN + OpenSanctions person/org/vessel search
app.get('/sanctions', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) {
    return res.status(400).json({ error: 'Missing required query param: q', example: '/sanctions?q=Evgeniy' });
  }
  const results = await searchSanctions(q);
  res.json({
    query: q,
    count: results.length,
    timestamp: new Date().toISOString(),
    results,
  });
});

// GET /crypto/btc/:address — BTC wallet trace via blockstream.info
app.get('/crypto/btc/:address', async (req, res) => {
  const info = await traceBtcAddress(req.params.address);
  if (!info) {
    return res.status(400).json({ error: 'Invalid BTC address', address: req.params.address });
  }
  (info as any).ofac_sanctioned = checkOfac(req.params.address);
  res.json(info);
});

// GET /crypto/eth/:address — ETH wallet trace via Blockscout
app.get('/crypto/eth/:address', async (req, res) => {
  const info = await traceEthAddress(req.params.address);
  if (!info) {
    return res.status(400).json({ error: 'Invalid ETH address', address: req.params.address });
  }
  (info as any).ofac_sanctioned = checkOfac(req.params.address);
  res.json(info);
});

// GET /fires?hours=24&region=middle_east — NASA FIRMS hotspots
app.get('/fires', async (req, res) => {
  const hours = Math.min(Math.max(parseInt(String(req.query.hours || '24'), 10) || 24, 1), 168);
  const region = req.query.region ? String(req.query.region) : undefined;
  const fires = await fetchFireHotspots(hours, region);
  res.json({
    window_hours: hours,
    region: region || 'world',
    count: fires.length,
    timestamp: new Date().toISOString(),
    hotspots: fires,
  });
});

// IMPORTANT: /cve/recent must come BEFORE /cve/:id, otherwise Express matches "recent" as the :id.
app.get('/cve/recent', async (req, res) => {
  const days = parseInt(String(req.query.days || '7'), 10) || 7;
  const minCvss = req.query.min_cvss ? parseFloat(String(req.query.min_cvss)) : undefined;
  const cves = await fetchRecentCves(days, minCvss);
  res.json({
    window_days: days,
    min_cvss: minCvss,
    count: cves.length,
    timestamp: new Date().toISOString(),
    cves,
  });
});

// GET /cve/:id — single CVE lookup (e.g. CVE-2024-12345)
app.get('/cve/:id', async (req, res) => {
  const cve = await fetchCve(req.params.id);
  if (!cve) {
    return res.status(404).json({ error: 'CVE not found or invalid format', id: req.params.id });
  }
  res.json(cve);
});

// GET /whois/:domain — RDAP/WHOIS lookup
app.get('/whois/:domain', async (req, res) => {
  const w = await whoisLookup(req.params.domain);
  if (!w) {
    return res.status(400).json({ error: 'Invalid domain', domain: req.params.domain });
  }
  // Auto-flag any registrant/country entities against OFAC cache
  const entities = (w.entities ?? []).map((e: any) => ({
    ...e,
    ofac_sanctioned: checkOfac(e.name ?? ''),
  }));
  res.json({ ...w, entities, domain_sanctioned: checkOfac(req.params.domain) });
});

// GET /dns/:domain — DNS records (A, AAAA, MX, TXT, NS, CNAME)
app.get('/dns/:domain', async (req, res) => {
  const d = await dnsLookup(req.params.domain);
  if (!d) {
    return res.status(400).json({ error: 'Invalid domain', domain: req.params.domain });
  }
  res.json(d);
});

// GET /telegram/:channel — recent messages from public channel
// (e.g. /telegram/durov, /telegram/reuters)
app.get('/telegram/:channel', async (req, res) => {
  const limit = Math.min(Math.max(parseInt(String(req.query.limit || '10'), 10) || 10, 1), 30);
  const msgs = await fetchTelegramChannel(req.params.channel, limit);
  if (!msgs || msgs.length === 0) {
    return res.json({
      channel: req.params.channel,
      count: 0,
      messages: [],
      note: 'No public messages found. Channel may be private or handle invalid.',
    });
  }
  res.json({
    channel: req.params.channel,
    count: msgs.length,
    timestamp: new Date().toISOString(),
    messages: msgs,
  });
});

// GET /space-weather — NOAA SWPC Kp index, solar flares, alerts
// (FREE — no API key required)
app.get('/space-weather', async (_req, res) => {
  const data = await fetchSpaceWeather();
  if (!data) return res.status(503).json({ error: 'Space weather feed unavailable' });
  res.json(data);
});

// GET /sentinel — Sentinel-1/2 satellite imagery search
// Query: ?lat=&lng=&radius=&days=&platform=sentinel-2-l2a|sentinel-1-grd
app.get('/sentinel', async (req, res) => {
  const lat = parseFloat(String(req.query.lat ?? ''));
  const lng = parseFloat(String(req.query.lng ?? ''));
  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: 'lat and lng query params required' });
  }
  const radius = parseFloat(String(req.query.radius ?? '2'));
  const days = parseInt(String(req.query.days ?? '30'), 10);
  const platform = (String(req.query.platform ?? 'sentinel-2-l2a')) as 'sentinel-1-grd' | 'sentinel-2-l2a';
  const scenes = await searchSentinelScenes(lat, lng, radius, days, platform);
  res.json({
    query: { lat, lng, radius, days, platform },
    count: scenes.length,
    scenes,
    timestamp: new Date().toISOString(),
  });
});

// GET /satellites — TLE catalog from Celestrak
// Query: ?category=stations|weather|starlink|amateur|gps-ops|...&limit=50
app.get('/satellites', async (req, res) => {
  const category = String(req.query.category ?? 'stations');
  const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '50'), 10) || 50, 1), 200);
  const sats = await fetchSatelliteCatalog(category, limit);
  res.json({
    category,
    count: sats.length,
    satellites: sats,
    timestamp: new Date().toISOString(),
  });
});

// GET /cyber-threats — CISA Known Exploited Vulnerabilities
// Query: ?days=30
app.get('/cyber-threats', async (req, res) => {
  const days = Math.min(Math.max(parseInt(String(req.query.days ?? '30'), 10) || 30, 1), 365);
  const data = await fetchCyberThreats(days);
  if (!data) return res.status(503).json({ error: 'Cyber threat feed unavailable' });
  res.json(data);
});

// GET /geo — IP geolocation (3-provider cascade)
// Query: ?ip=8.8.8.8 (omit for caller IP)
app.get('/geo', async (req, res) => {
  const ip = String(req.query.ip ?? '');
  const data = await geoLocate(ip);
  if (!data) return res.status(503).json({ error: 'Geolocation lookup failed across all providers' });
  (data as any).ofac_sanctioned = checkOfac(ip || data.ip);
  res.json(data);
});

// GET /air-quality — Open-Meteo current AQI for 22 major global cities
// (FREE — no API key required)
app.get('/air-quality', async (_req, res) => {
  const stations = await fetchAirQuality();
  res.json({
    count: stations.length,
    cities_with_poor_air: stations.filter(s => (s.us_aqi ?? 0) > 100).length,
    stations,
    timestamp: new Date().toISOString(),
  });
});

// GET /ssl/:host — SSL/TLS certificate inspector
// Query: ?port=443 (default 443)
app.get('/ssl/:host', async (req, res) => {
  const port = parseInt(String(req.query.port ?? '443'), 10) || 443;
  const report = await inspectTlsCertificate(req.params.host, port);
  if (!report) return res.status(400).json({ error: 'Invalid hostname' });
  res.json(report);
});

// GET /ofac/check?q= — single-value OFAC cross-check
// (Requires OPENSANCTIONS_API_KEY and a populated cache. Returns null otherwise.)
app.get('/ofac/check', async (req, res) => {
  const q = String(req.query.q ?? '').trim();
  if (!q) return res.status(400).json({ error: 'q parameter required' });
  const sanctioned = checkOfac(q);
  res.json({
    query: q,
    ofac_sanctioned: sanctioned,
    ofac_cache_size: ofacCacheSize(),
    note: sanctioned === null ? 'OFAC check unavailable (no API key or empty cache)' : 'auto-flag from cached sanctions data',
  });
});

// POST /ofac/refresh — reload OFAC cache from OpenSanctions
app.post('/ofac/refresh', async (_req, res) => {
  const added = await refreshOfacCache();
  res.json({ added, cache_size: ofacCacheSize(), timestamp: new Date().toISOString() });
});

// GET /scan — Port scanner (requires PORT_SCAN_ENABLED=true in env)
// Query: ?host=&ports=22,80,443  (comma-separated; omit for default 31-port scan)
app.get('/scan', async (req, res) => {
  const host = String(req.query.host ?? '').trim();
  if (!host) return res.status(400).json({ error: 'host query param required' });
  let ports: number[] | undefined;
  if (req.query.ports) {
    ports = String(req.query.ports)
      .split(',')
      .map(p => parseInt(p.trim(), 10))
      .filter(p => !isNaN(p) && p > 0 && p < 65536);
  }
  const result = await scanPorts(host, ports);
  if (!result) return res.status(400).json({ error: 'Invalid host' });
  res.json(result);
});

// Keep the API contract JSON even for unknown routes and unexpected failures.
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) return next(err);
  console.error(`[http] unhandled ${req.method} ${req.path}`, err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`ClawdWatch Lobster Edition v2.5.0 running on port ${PORT}`);
  console.log(`  regions:  ${ALL_REGIONS.length}`);
  console.log(`  rss:      ${RSS_FEEDS.filter((f) => f.enabled).length} feeds enabled`);
  console.log(`  defcon:   GET /defcon for current DEFCON level`);
  console.log(`  osiris:   /sanctions /crypto/* /fires /cve/* /whois/* /dns/* /telegram/*`);
  console.log(`            /space-weather /sentinel /satellites /cyber-threats /geo /air-quality`);
  console.log(`  recon:    /ssl/:host /news/live /ofac/check /ofac/refresh /scan`);
  console.log(`  scan:     ${process.env.PORT_SCAN_ENABLED === 'true' ? 'ENABLED' : 'disabled (set PORT_SCAN_ENABLED=true)'}`);
  console.log(`  ofac:     ${process.env.OPENSANCTIONS_API_KEY ? 'API key set (cache will populate on /ofac/refresh)' : 'no API key (auto-flag checks return null)'}`);
});
