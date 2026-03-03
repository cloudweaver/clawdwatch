import express from 'express';
import https from 'https';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
const PORT = 3444;

// OpenSky API configuration
const OPENSKY_API_KEY = process.env.OPENSKY_API_KEY || ''; // Get free key at https://opensky-network.org/api/#registration
const OPENSKY_AUTH_HEADER = OPENSKY_API_KEY ? { 'Authorization': OPENSKY_API_KEY } : {};

// Rate limiting state
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 10000; // 10 seconds between requests (OpenSky free tier limit)
const MAX_RETRIES = 3;
const RETRY_DELAY = 30000; // 30 seconds wait on rate limit

// Simple cache for API responses
const cache: { [key: string]: { data: any; timestamp: number } } = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fetchWithRateLimit = async (url: string, useCache = true): Promise<any> => {
  const cacheKey = url;
  
  // Check cache first
  if (useCache && cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < CACHE_TTL) {
    return cache[cacheKey].data;
  }
  
  // Rate limiting - wait between requests
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    console.log(`Rate limiting: waiting ${waitTime}ms before request`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
  
  // Make request with retry logic
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await axios.get(url, {
        headers: {
          ...OPENSKY_AUTH_HEADER,
          'User-Agent': 'Clawdwatch-Lobster-Edition/1.0'
        },
        timeout: 15000
      });
      
      // Check for rate limit response
      if (response.status === 429 || response.data?.message === 'Too many requests') {
        console.log(`Rate limited by OpenSky, attempt ${attempt + 1}/${MAX_RETRIES}, waiting ${RETRY_DELAY}ms`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        lastRequestTime = Date.now(); // Reset after rate limit
        continue;
      }
      
      // Cache successful response
      if (response.data && Object.keys(response.data).length > 0) {
        cache[cacheKey] = { data: response.data, timestamp: Date.now() };
      }
      return response.data;
      
    } catch (error: any) {
      if (error.response?.status === 429 || error.message.includes('429')) {
        console.log(`Rate limited (error), attempt ${attempt + 1}/${MAX_RETRIES}, waiting ${RETRY_DELAY}ms`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        lastRequestTime = Date.now();
        continue;
      }
      throw error;
    }
  }
  
  return { error: 'Max retries exceeded', message: 'OpenSky rate limit - try again later or add API key' };
};

// Legacy function for compatibility
const fetchJson = fetchWithRateLimit;

// News types
interface NewsItem {
  title: string;
  url: string;
  source: string;
  region: string;
  timestamp: string;
}

// News scrapers
async function fetchReuters(): Promise<NewsItem[]> {
  try {
    const response = await axios.get('https://www.reuters.com/world/middle-east/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Clawdwatch/1.0)' },
      timeout: 10000,
    });
    const $ = cheerio.load(response.data);
    const items: NewsItem[] = [];
    $('article h3, [data-testid="Heading"] a').each((i, el) => {
      const title = $(el).text().trim();
      const link = $(el).attr('href') || $(el).find('a').attr('href');
      if (title && title.length > 10) {
        items.push({
          title: title.slice(0, 120),
          url: link?.startsWith('http') ? link : `https://www.reuters.com${link}`,
          source: 'Reuters',
          region: 'middle_east',
          timestamp: new Date().toISOString(),
        });
      }
    });
    return items.slice(0, 10);
  } catch (e: any) {
    console.error('Reuters error:', e.message);
    return [];
  }
}

async function fetchAlJazeera(): Promise<NewsItem[]> {
  try {
    const response = await axios.get('https://www.aljazeera.com/middle-east/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Clawdwatch/1.0)' },
      timeout: 10000,
    });
    const $ = cheerio.load(response.data);
    const items: NewsItem[] = [];
    $('article h3 a, .gc__title a').each((i, el) => {
      const title = $(el).text().trim();
      const link = $(el).attr('href');
      if (title && title.length > 10) {
        items.push({
          title: title.slice(0, 120),
          url: link?.startsWith('http') ? link : `https://www.aljazeera.com${link}`,
          source: 'Al Jazeera',
          region: 'middle_east',
          timestamp: new Date().toISOString(),
        });
      }
    });
    return items.slice(0, 10);
  } catch (e: any) {
    console.error('Al Jazeera error:', e.message);
    return [];
  }
}

async function fetchAP(): Promise<NewsItem[]> {
  try {
    const response = await axios.get('https://apnews.com/hub/middle-east', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Clawdwatch/1.0)' },
      timeout: 10000,
    });
    const $ = cheerio.load(response.data);
    const items: NewsItem[] = [];
    $('article h3 a, .headline a').each((i, el) => {
      const title = $(el).text().trim();
      const link = $(el).attr('href');
      if (title && title.length > 10) {
        items.push({
          title: title.slice(0, 120),
          url: link?.startsWith('http') ? link : `https://apnews.com${link}`,
          source: 'AP News',
          region: 'middle_east',
          timestamp: new Date().toISOString(),
        });
      }
    });
    return items.slice(0, 10);
  } catch (e: any) {
    console.error('AP error:', e.message);
    return [];
  }
}

// Region definitions - Using upstream cloudweaver bounds
const REGIONS: { [key: string]: { name: string; lat: number[]; lon: number[] } } = {
  middle_east: { name: 'Middle East', lat: [12, 42], lon: [25, 65] },
  europe: { name: 'Europe', lat: [35, 72], lon: [-10, 40] },
  usa: { name: 'USA', lat: [24, 50], lon: [-125, -66] },
  asia: { name: 'Asia', lat: [5, 55], lon: [70, 145] },
  eastern_europe: { name: 'Eastern Europe', lat: [44, 70], lon: [15, 60] },
  central_asia: { name: 'Central Asia', lat: [30, 55], lon: [50, 90] },
  south_asia: { name: 'South Asia', lat: [5, 40], lon: [60, 100] },
  east_asia: { name: 'East Asia', lat: [15, 50], lon: [100, 150] },
  africa: { name: 'Africa', lat: [-35, 37], lon: [-20, 60] },
  north_america: { name: 'North America', lat: [15, 75], lon: [-170, -50] },
  south_america: { name: 'South America', lat: [-60, 15], lon: [-85, -30] },
  oceania: { name: 'Oceania', lat: [-50, 0], lon: [110, 180] },
  // Conflict regions - Using upstream bounds
  iran: { name: 'Iran', lat: [12, 42], lon: [25, 65] },
  israel: { name: 'Israel/Palestine', lat: [29, 34], lon: [34, 36] },
  lebanon: { name: 'Lebanon', lat: [33, 35], lon: [35, 37] },
  syria: { name: 'Syria', lat: [32, 42], lon: [35, 43] },
  iraq: { name: 'Iraq', lat: [29, 38], lon: [38, 49] },
  saudi_arabia: { name: 'Saudi Arabia', lat: [16, 33], lon: [34, 56] },
  uae: { name: 'UAE', lat: [22, 27], lon: [51, 57] },
  qatar: { name: 'Qatar', lat: [24, 27], lon: [50, 52] },
  kuwait: { name: 'Kuwait', lat: [28, 31], lon: [46, 49] },
  turkey: { name: 'Turkey', lat: [36, 42], lon: [26, 45] },
  yemen: { name: 'Yemen', lat: [12, 20], lon: [42, 55] },
};

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Fetch flights for a region
async function getFlightsForRegion(region: string) {
  const config = REGIONS[region];
  if (!config) return { error: 'Unknown region: ' + region };
  
  const [lamin, lamax] = config.lat;
  const [lomin, lomax] = config.lon;
  const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
  
  try {
    const data = await fetchJson(url, true);
    if (data.error || data.message === 'Too many requests') {
      return { error: data.message || 'Rate limited', total: 0, flights: [] };
    }
    return {
      region: config.name,
      regionId: region,
      total: data.states?.length || 0,
      flights: data.states?.slice(0, 50) || []
    };
  } catch (e: any) {
    return { error: e.message, total: 0, flights: [] };
  }
}

app.get('/status', (req, res) => {
  res.json({ 
    status: 'running', 
    service: 'clawdwatch-lobster-edition', 
    port: PORT, 
    version: '1.0.0-lobster',
    regions: Object.keys(REGIONS).length,
    cacheActive: true,
    timestamp: new Date().toISOString()
  });
});

app.get('/regions', (req, res) => {
  res.json({ 
    regions: Object.entries(REGIONS).map(([key, value]) => ({
      id: key,
      ...value
    }))
  });
});

app.get('/flights', async (req, res) => {
  const results = await Promise.all([
    getFlightsForRegion('middle_east'),
    getFlightsForRegion('europe'),
    getFlightsForRegion('iran'),
    getFlightsForRegion('israel'),
  ]);
  
  const allFlights: any[] = [];
  const regions: string[] = [];
  
  for (const r of results) {
    if (r.error) continue;
    allFlights.push(...(r.flights || []));
    if (r.region) regions.push(r.region);
  }
  
  res.json({ 
    timestamp: new Date().toISOString(),
    source: 'OpenSky Network',
    regions: regions,
    total: allFlights.length,
    flights: allFlights.slice(0, 200)
  });
});

app.get('/flights/:region', async (req, res) => {
  const region = req.params.region.toLowerCase();
  const result = await getFlightsForRegion(region);
  res.json({
    timestamp: new Date().toISOString(),
    source: 'OpenSky Network',
    ...result
  });
});

// NEWS ENDPOINT
app.get('/news', async (req, res) => {
  const [reuters, aljazeera, ap] = await Promise.all([
    fetchReuters(),
    fetchAlJazeera(),
    fetchAP()
  ]);
  
  const allNews = [...reuters, ...aljazeera, ...ap];
  
  res.json({
    timestamp: new Date().toISOString(),
    sources: ['Reuters', 'Al Jazeera', 'AP News'],
    total: allNews.length,
    news: allNews.slice(0, 30)
  });
});

// OSINT endpoint
app.get('/osint', async (req, res) => {
  const conflictRegions = ['iran', 'israel', 'lebanon', 'syria', 'iraq', 'yemen', 'saudi_arabia', 'uae', 'qatar', 'kuwait', 'turkey'];
  const flightResults = await Promise.all(conflictRegions.map(r => getFlightsForRegion(r)));
  
  const [reuters, aljazeera, ap] = await Promise.all([
    fetchReuters(),
    fetchAlJazeera(),
    fetchAP()
  ]);
  
  const flightsByRegion = conflictRegions.map((region, i) => ({
    region: REGIONS[region]?.name || region,
    flights: flightResults[i].total || 0
  }));
  
  const totalFlights = flightResults.reduce((sum, r) => sum + (r.total || 0), 0);
  const allNews = [...reuters, ...aljazeera, ...ap];
  
  res.json({ 
    timestamp: new Date().toISOString(),
    flights: {
      total: totalFlights,
      byRegion: flightsByRegion.filter(r => r.flights > 0)
    },
    news: {
      total: allNews.length,
      sources: ['Reuters', 'Al Jazeera', 'AP News'],
      headlines: allNews.slice(0, 15)
    },
    summary: `Tracking ${totalFlights} flights across conflict zones, ${allNews.length} news headlines`
  });
});

// CONFLICT endpoint
app.get('/conflict', async (req, res) => {
  const conflictRegions = ['iran', 'israel', 'lebanon', 'syria', 'iraq', 'yemen', 'saudi_arabia', 'uae', 'qatar', 'kuwait', 'turkey'];
  
  const flightResults = await Promise.all(conflictRegions.map(r => getFlightsForRegion(r)));
  
  const [reuters, aljazeera, ap] = await Promise.all([
    fetchReuters(),
    fetchAlJazeera(),
    fetchAP()
  ]);
  
  const conflictZones = conflictRegions.map((region, i) => ({
    region: REGIONS[region]?.name || region,
    regionId: region,
    flights: flightResults[i].total || 0
  }));
  
  const totalConflictFlights = flightResults.reduce((sum, r) => sum + (r.total || 0), 0);
  const allNews = [...reuters, ...aljazeera, ...ap];
  
  res.json({ 
    timestamp: new Date().toISOString(),
    source: 'OpenSky Network + News Scrapers',
    conflictZones,
    totalConflictFlights,
    news: {
      total: allNews.length,
      sources: ['Reuters', 'Al Jazeera', 'AP News'],
      latest: allNews.slice(0, 10)
    },
    summary: `${totalConflictFlights} flights across ${conflictZones.length} conflict zones, ${allNews.length} news items`
  });
});

app.get('/ships', (req, res) => {
  res.json({ message: 'Ship tracking requires AIS API key configuration' });
});

app.get('/snapshot', async (req, res) => {
  const osint = await getFlightsForRegion('middle_east');
  const news = await Promise.all([fetchReuters(), fetchAlJazeera(), fetchAP()]);
  
  res.json({
    timestamp: new Date().toISOString(),
    version: '1.0.0-lobster',
    flights: {
      middle_east: osint.total || 0
    },
    news: {
      total: news.reduce((sum, n) => sum + n.length, 0),
      sources: ['Reuters', 'Al Jazeera', 'AP News']
    },
    summary: `Middle East: ${osint.total || 0} flights`
  });
});

app.listen(PORT, () => {
  console.log('Clawdwatch HTTP API running on port ' + PORT + ' with caching enabled');
});
