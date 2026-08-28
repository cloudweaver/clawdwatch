import axios from 'axios';

/**
 * Global intel sources. These are all public, free, machine-readable endpoints
 * (no scraping). They give us situational awareness well beyond news headlines.
 */

export interface Earthquake {
  id: string;
  magnitude: number;
  place: string;
  time: string;     // ISO
  url: string;
  tsunami: boolean;
  depth_km: number;
  coords: [number, number];
  felt?: number;
  alert?: 'green' | 'yellow' | 'orange' | 'red';
}

export interface WeatherAlert {
  id: string;
  event: string;          // e.g. "Tornado Warning"
  headline: string;
  area: string;
  severity: 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown';
  certainty: string;
  urgency: string;
  effective: string;
  expires: string;
  description: string;
  instruction?: string;
  states?: string[];
}

const cache: Map<string, { data: any; ts: number }> = new Map();
const TTL = 5 * 60 * 1000; // 5 min for these

async function cached<T>(key: string, fn: () => Promise<T>, ttl = TTL): Promise<T | null> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < ttl) return hit.data as T;
  try {
    const data = await fn();
    cache.set(key, { data, ts: Date.now() });
    return data;
  } catch (e: any) {
    console.error(`[intel:${key}] error: ${e.message}`);
    return null;
  }
}

/**
 * USGS All-Earthquakes feed, last 24h, magnitude 2.5+ worldwide.
 * Free, no auth, GeoJSON.
 * https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson
 */
export async function fetchEarthquakes(minMag = 4.0): Promise<Earthquake[]> {
  const data = await cached('usgs_quakes_day', async () => {
    const res = await axios.get('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson', {
      timeout: 15_000,
      headers: { 'User-Agent': 'ClawdWatch-Lobster/1.0' },
    });
    return res.data;
  });
  if (!data) return [];

  const out: Earthquake[] = [];
  for (const f of data.features || []) {
    const m = f.properties?.mag ?? 0;
    if (m < minMag) continue;
    const [lon, lat, depth] = f.geometry?.coordinates || [0, 0, 0];
    out.push({
      id: f.id,
      magnitude: m,
      place: f.properties?.place || 'Unknown',
      time: new Date(f.properties?.time).toISOString(),
      url: f.properties?.detail || `https://earthquake.usgs.gov/earthquakes/eventpage/${f.id}`,
      tsunami: !!f.properties?.tsunami,
      depth_km: depth,
      coords: [lat, lon],
      felt: f.properties?.felt,
      alert: f.properties?.alert,
    });
  }
  // Newest first, then biggest
  out.sort((a, b) => b.time.localeCompare(a.time));
  return out;
}

/**
 * NWS Active Alerts — entire US. Free public API, no key needed.
 * https://api.weather.gov/alerts/active
 */
export async function fetchUsWeatherAlerts(): Promise<WeatherAlert[]> {
  const data = await cached('nws_alerts', async () => {
    const res = await axios.get('https://api.weather.gov/alerts/active', {
      timeout: 15_000,
      headers: { 'User-Agent': 'ClawdWatch-Lobster/1.0 (contact: ops@localhost)' },
    });
    return res.data;
  });
  if (!data) return [];

  return (data.features || []).map((f: any) => {
    const p = f.properties || {};
    return {
      id: f.id,
      event: p.event,
      headline: p.headline,
      area: p.areaDesc,
      severity: p.severity,
      certainty: p.certainty,
      urgency: p.urgency,
      effective: p.effective,
      expires: p.expires,
      description: p.description,
      instruction: p.instruction,
      states: (p.geocode?.sameCodes || []).filter((c: string) => c.startsWith('US')).map((c: string) => c.replace(/^US/, '')),
    } as WeatherAlert;
  });
}

/**
 * Open-Meteo: global current weather, no key needed.
 * Used for "current conditions at point" lookups.
 */
export interface CurrentWeather {
  temperature: number;
  windspeed: number;
  weathercode: number;
  time: string;
}

export async function fetchCurrentWeather(lat: number, lon: number): Promise<CurrentWeather | null> {
  const data = await cached(`weather:${lat.toFixed(2)},${lon.toFixed(2)}`, async () => {
    const res = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: lat,
        longitude: lon,
        current_weather: true,
      },
      timeout: 10_000,
    });
    return res.data?.current_weather;
  }, 15 * 60 * 1000);
  return data || null;
}

/**
 * GDACS — Global Disaster Alert and Coordination System.
 * Aggregates earthquakes, tsunamis, volcanoes, cyclones, floods, wildfires globally.
 * Free, public, RSS + JSON.
 * https://gdacs.org/
 */
export interface GdacsEvent {
  eventid: string;
  eventtype: 'EQ' | 'TC' | 'TS' | 'VO' | 'WF' | 'FL' | 'DR';
  name: string;
  description?: string;
  fromdate: string;
  todate: string;
  alertlevel: 'Green' | 'Orange' | 'Red';
  severity?: number;
  country?: string;
  iso3?: string;
  lat: number;
  lon: number;
  url: string;
}

export async function fetchGdacsEvents(): Promise<GdacsEvent[]> {
  const data = await cached('gdacs_events', async () => {
    const res = await axios.get('https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?fromDate=2024-01-01&limit=100', {
      timeout: 18_000,
      headers: { 'User-Agent': 'ClawdWatch-Lobster/1.0' },
    });
    return res.data;
  }, 30 * 60 * 1000);
  if (!data) return [];
  return (data.features || data.events || []) as GdacsEvent[];
}

/**
 * DEFCON level from defconlevel.com. The site's "current level" page has a
 * clear <h1> followed by a hero block with the current level in <strong>.
 * We parse the first integer in that hero block.
 *
 * DEFCON scale: 5 (lowest tension) ... 1 (highest tension, imminent war).
 * The "current" is the editor's reading, not an official US military status.
 */
export interface DefconStatus {
  level: 1 | 2 | 3 | 4 | 5;
  description: string;
  /** 0-100: DEFCON 1 = 100 (max threat), DEFCON 5 = 0 (no threat) */
  threatScore: number;
  source: string;
  url: string;
  fetchedAt: string;
}

/**
 * DEFCON 5 — Normal peacetime readiness.
 * Minimum alert state. Standard operations continue with routine monitoring.
 * No imminent threat; general awareness maintained.
 */
export const DEFCON_SCORE_5 = 0;

/**
 * DEFCON 4 — Above normal readiness.
 * Possible terrorist activity or regional conflict. Increased intelligence
 * monitoring. Heightened border and infrastructure security. Cyber threat
 * activity elevated. All-source intel collection intensified.
 */
export const DEFCON_SCORE_4 = 25;

/**
 * DEFCON 3 — Armed Forces ready to mobilize in 15 minutes.
 * Terrorist attack possible. Significant cyber intrusion campaigns active.
 * Air defense forces on increased alert. Civilian aviation subject to
 * enhanced screening. Public advised to maintain awareness.
 */
export const DEFCON_SCORE_3 = 50;

/**
 * DEFCON 2 — Next step to nuclear war; armed forces fully mobilized.
 * Direct military threat. Terrorist attack likely. Critical infrastructure
 * at severe risk. Strategic forces on standby. Potential for conventional
 * or nuclear exchange elevated.
 */
export const DEFCON_SCORE_2 = 75;

/**
 * DEFCON 1 — Maximum readiness; nuclear war imminent or in progress.
 * Maximum alert. All military assets mobilized. National Command Authority
 * online. Civilian defense preparations underway. Immediate shelter protocols
 * may be ordered. This is the highest peacetime alert ever recorded.
 */
export const DEFCON_SCORE_1 = 100;

const DEFCON_SCORES: Record<1|2|3|4|5, number> = {
  1: DEFCON_SCORE_1,
  2: DEFCON_SCORE_2,
  3: DEFCON_SCORE_3,
  4: DEFCON_SCORE_4,
  5: DEFCON_SCORE_5,
};

/**
 * DEFCON Level → Threat Score (0-100).
 * Score is linear: DEFCON 1 = 100 (max threat), DEFCON 5 = 0 (no threat).
 */
export function defconScore(level: 1|2|3|4|5): number {
  return DEFCON_SCORES[level] ?? 0;
}

const DEFCON_DESCRIPTIONS: Record<1|2|3|4|5, string> = {
  5: 'DEFCON 5 — Normal peacetime readiness. Standard monitoring posture. No imminent threat.',
  4: 'DEFCON 4 — Above normal readiness. Possible terrorist activity or regional conflict. Heightened vigilance.',
  3: 'DEFCON 3 — Armed Forces ready to mobilize in 15 minutes. Terrorist attack possible. Air defense alert.',
  2: 'DEFCON 2 — Armed forces mobilized. Direct military threat. Terrorist attack likely. Critical infrastructure at severe risk.',
  1: 'DEFCON 1 — Maximum readiness. Nuclear war imminent or in progress. ALL systems critical.',
};

export async function fetchDefconLevel(): Promise<DefconStatus | null> {
  return cached<DefconStatus>('defconlevel_current', async () => {
    const res = await axios.get('https://www.defconlevel.com/current-level', {
      timeout: 15_000,
      headers: { 'User-Agent': 'ClawdWatch-Lobster/1.0' },
      validateStatus: () => true,
    });
    if (res.status >= 400) {
      throw new Error(`defconlevel.com HTTP ${res.status}`);
    }
    const html: string = res.data;
    // Primary pattern: <h1>Current DEFCON Level...</h1> ... <p class="hero-lead"><strong>DEFCON N
    const heroMatch = html.match(/<h1[^>]*>Current DEFCON Level[^<]*<\/h1>[\s\S]{0,3000}?<strong>\s*DEFCON\s*([1-5])/i);
    let level: 1|2|3|4|5 | null = null;
    if (heroMatch) {
      level = parseInt(heroMatch[1], 10) as 1|2|3|4|5;
    } else {
      // Fallback: first DEFCON N in body
      const fallback = html.match(/DEFCON\s*([1-5])/);
      if (fallback) level = parseInt(fallback[1], 10) as 1|2|3|4|5;
    }
    if (!level) {
      throw new Error('defconlevel.com: could not parse current level');
    }
    return {
      level,
      description: DEFCON_DESCRIPTIONS[level],
      threatScore: defconScore(level),
      source: 'defconlevel.com',
      url: 'https://www.defconlevel.com/current-level',
      fetchedAt: new Date().toISOString(),
    };
  }, 15 * 60 * 1000);
}

