import { telegramAlerter } from './alerts/telegram';
import {
  RegionName,
  getRegionDefinition,
  listRegionDefinitions,
  resolveRegionInputs,
} from './regions';
import { CountryConnectivity, OutageAlert, internetMonitor } from './sources/internet';
import { Flight, FlightAlert, flightTracker } from './sources/flights';
import { NewsItem, newsAggregator } from './sources/news';
import { satelliteTracker } from './sources/satellite';
import { Ship, shipTracker } from './sources/ships';
import { SocialPost, socialMonitor } from './sources/social';

type CliCommand = 'watch' | 'snapshot' | 'regions' | 'help';
type ShipWaterway = 'strait_hormuz' | 'suez' | 'gulf_oman' | 'red_sea' | 'persian_gulf';

interface CliOptions {
  command: CliCommand;
  regions: RegionName[];
  json: boolean;
  includeSatellite: boolean;
  satelliteDays: number;
  shipRegions: ShipWaterway[];
}

interface FlightSample {
  callsign: string;
  origin: string;
  altitude: number;
  speed: number;
  squawk: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

interface FlightAlertSummary {
  type: FlightAlert['type'];
  message: string;
  callsign: string;
  timestamp: string;
}

interface FlightRegionSummary {
  total: number;
  military: number;
  emergency: number;
  alerts: FlightAlertSummary[];
  militarySamples: FlightSample[];
  emergencySamples: FlightSample[];
  activeSamples: FlightSample[];
}

interface ConnectivitySummary {
  country: string;
  countryCode: string;
  status: CountryConnectivity['status'];
  changePercent: number;
  lastUpdate: string;
}

interface InternetAlertSummary {
  severity: OutageAlert['severity'];
  message: string;
  timestamp: string;
}

interface RegionSnapshot {
  region: RegionName;
  label: string;
  description: string;
  flights: FlightRegionSummary;
  internet: {
    monitored: number;
    issueCount: number;
    statuses: ConnectivitySummary[];
    alerts: InternetAlertSummary[];
  };
}

interface NewsSummary {
  title: string;
  source: string;
  region: string;
  url: string;
  timestamp: string;
}

interface SocialSummary {
  platform: SocialPost['platform'];
  author: string;
  text: string;
  url: string;
  timestamp: string;
  isFirstHand: boolean;
  hasMedia: boolean;
}

interface ShipSummary {
  waterway: ShipWaterway;
  label: string;
  total: number;
  military: number;
  tankers: number;
  samples: Array<{
    name: string;
    mmsi: string;
    type: string;
    speed: number;
    latitude: number;
    longitude: number;
    timestamp: number;
  }>;
}

interface SatelliteSummary {
  enabled: boolean;
  days: number;
  locations: Array<{
    location: string;
    imageCount: number;
    latestTimestamp: string | null;
  }>;
}

interface MonitorSnapshot {
  generatedAt: string;
  requestedRegions: RegionName[];
  sourceStatus: {
    telegram: boolean;
    twitter: boolean;
    satelliteConfigured: boolean;
    shipsConfigured: boolean;
  };
  regions: RegionSnapshot[];
  news: NewsSummary[];
  social: SocialSummary[];
  ships?: ShipSummary[];
  satellite?: SatelliteSummary;
}

const LOGO = `
============================================================
  CLAWDWATCH
  Pullable OSINT pipeline for agents and human operators
============================================================
`.trim();

const REFRESH_INTERVAL_MS = 60_000;
const SHIP_WATERWAY_LABELS: Record<ShipWaterway, string> = {
  strait_hormuz: 'Strait of Hormuz',
  suez: 'Suez Canal',
  gulf_oman: 'Gulf of Oman',
  red_sea: 'Red Sea',
  persian_gulf: 'Persian Gulf',
};

let sendShutdownNotice = false;

function printHeader(): void {
  console.log(LOGO);
}

function printStatus(message: string): void {
  console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
}

function trimText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

function formatRegionList(regions: RegionName[]): string {
  return regions
    .map((region) => getRegionDefinition(region)?.label || region)
    .join(', ');
}

function serializeFlight(flight: Flight): FlightSample {
  return {
    callsign: flight.callsign || 'UNKNOWN',
    origin: flight.origin || 'N/A',
    altitude: Math.round(flight.altitude),
    speed: Math.round(flight.speed),
    squawk: flight.squawk || '',
    latitude: flight.latitude,
    longitude: flight.longitude,
    timestamp: new Date(flight.timestamp * 1000).toISOString(),
  };
}

function serializeFlightAlert(alert: FlightAlert): FlightAlertSummary {
  return {
    type: alert.type,
    message: alert.message,
    callsign: alert.flight.callsign || 'UNKNOWN',
    timestamp: alert.timestamp.toISOString(),
  };
}

function serializeNews(item: NewsItem): NewsSummary {
  return {
    title: item.title,
    source: item.source,
    region: item.region,
    url: item.url,
    timestamp: item.timestamp.toISOString(),
  };
}

function serializeSocial(post: SocialPost): SocialSummary {
  return {
    platform: post.platform,
    author: post.author,
    text: post.text,
    url: post.url,
    timestamp: post.timestamp.toISOString(),
    isFirstHand: post.isFirstHand,
    hasMedia: post.hasMedia,
  };
}

function resolveShipRegions(values: string[]): ShipWaterway[] {
  if (values.length === 0) {
    return [];
  }

  const resolved = new Set<ShipWaterway>();
  const validWaterways = Object.keys(SHIP_WATERWAY_LABELS) as ShipWaterway[];

  for (const rawValue of values) {
    for (const token of rawValue.split(',')) {
      const normalized = token.trim().toLowerCase().replace(/[\s-]+/g, '_');

      if (!normalized) {
        continue;
      }

      if (normalized === 'all') {
        validWaterways.forEach((waterway) => resolved.add(waterway));
        continue;
      }

      if (!validWaterways.includes(normalized as ShipWaterway)) {
        throw new Error(
          `Unknown ship region "${token}". Valid values: ${validWaterways.join(', ')}, all.`,
        );
      }

      resolved.add(normalized as ShipWaterway);
    }
  }

  return Array.from(resolved);
}

function readRequiredValue(option: string, value: string | undefined): string {
  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${option}.`);
  }

  return value;
}

function parsePositiveInteger(value: string, option: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${option} expects a positive integer.`);
  }

  return parsed;
}

function parseCommand(token?: string): CliCommand | undefined {
  if (!token) {
    return undefined;
  }

  const normalized = token.toLowerCase();
  if (
    normalized === 'watch' ||
    normalized === 'snapshot' ||
    normalized === 'regions' ||
    normalized === 'help'
  ) {
    return normalized;
  }

  return undefined;
}

function parseCliOptions(argv: string[]): CliOptions {
  const firstCommand = parseCommand(argv[0]);
  let command: CliCommand = firstCommand || 'watch';
  let index = firstCommand ? 1 : 0;
  let json = false;
  let includeSatellite = false;
  let satelliteDays = 3;
  const regionInputs: string[] = [];
  const shipInputs: string[] = [];

  while (index < argv.length) {
    const arg = argv[index];

    switch (arg) {
      case '--help':
      case '-h':
        command = 'help';
        index += 1;
        break;
      case '--json':
        json = true;
        index += 1;
        break;
      case '--region':
      case '--regions':
        regionInputs.push(readRequiredValue(arg, argv[index + 1]));
        index += 2;
        break;
      case '--all-regions':
        regionInputs.push('all');
        index += 1;
        break;
      case '--ships':
        shipInputs.push(readRequiredValue(arg, argv[index + 1]));
        index += 2;
        break;
      case '--satellite':
        includeSatellite = true;
        index += 1;
        break;
      case '--days':
        satelliteDays = parsePositiveInteger(readRequiredValue(arg, argv[index + 1]), arg);
        index += 2;
        break;
      default:
        if (arg.startsWith('--')) {
          throw new Error(`Unknown option "${arg}".`);
        }

        regionInputs.push(arg);
        index += 1;
        break;
    }
  }

  return {
    command,
    regions: resolveRegionInputs(regionInputs),
    json,
    includeSatellite,
    satelliteDays,
    shipRegions: resolveShipRegions(shipInputs),
  };
}

async function collectFlightSummaries(
  regions: RegionName[],
  dispatchAlerts: boolean,
): Promise<Map<RegionName, FlightRegionSummary>> {
  // Use Promise.allSettled to handle individual region failures
  const regionResults = await Promise.allSettled(regions.map((region) => flightTracker.getRegion(region)));
  const flightsByRegion = regionResults.map((result) => 
    result.status === 'fulfilled' ? result.value : []
  );
  const summaries = new Map<RegionName, FlightRegionSummary>();

  for (const [index, region] of regions.entries()) {
    const flights = flightsByRegion[index];
    const alerts = flightTracker.analyze(flights);

    if (dispatchAlerts && telegramAlerter.isEnabled()) {
      for (const alert of alerts) {
        await telegramAlerter.sendFlightAlert(alert);
      }
    }

    const militaryFlights = flights.filter((flight) => flightTracker.isMilitary(flight));
    const emergencyFlights = flights.filter((flight) => flightTracker.isEmergency(flight));
    const activeFlights = flights
      .filter((flight) => flight.altitude > 10_000 && !flightTracker.isMilitary(flight) && flight.speed > 200)
      .sort((left, right) => right.altitude - left.altitude)
      .slice(0, 5);

    summaries.set(region, {
      total: flights.length,
      military: militaryFlights.length,
      emergency: emergencyFlights.length,
      alerts: alerts.map(serializeFlightAlert),
      militarySamples: militaryFlights.slice(0, 5).map(serializeFlight),
      emergencySamples: emergencyFlights.slice(0, 5).map(serializeFlight),
      activeSamples: activeFlights.map(serializeFlight),
    });
  }

  return summaries;
}

function buildRegionInternetSummary(
  region: RegionName,
  connectivity: CountryConnectivity[],
  alerts: OutageAlert[],
): RegionSnapshot['internet'] {
  const regionDefinition = getRegionDefinition(region);
  const monitoredCodes = new Set(regionDefinition?.internetCountryCodes || []);
  const statuses = connectivity
    .filter((status) => monitoredCodes.has(status.countryCode))
    .map((status) => ({
      country: status.country,
      countryCode: status.countryCode,
      status: status.status,
      changePercent: status.changePercent,
      lastUpdate: status.lastUpdate.toISOString(),
    }));

  const filteredAlerts = alerts
    .filter((alert) => monitoredCodes.has(alert.countryCode))
    .map((alert) => ({
      severity: alert.severity,
      message: alert.message,
      timestamp: alert.timestamp.toISOString(),
    }));

  return {
    monitored: statuses.length,
    issueCount: statuses.filter((status) => status.status !== 'normal').length,
    statuses,
    alerts: filteredAlerts,
  };
}

async function collectShipSummaries(shipRegions: ShipWaterway[]): Promise<ShipSummary[] | undefined> {
  if (shipRegions.length === 0) {
    return undefined;
  }

  const shipsByWaterway = await Promise.all(shipRegions.map((region) => shipTracker.getStrategicWaters(region)));

  return shipRegions.map((region, index) => {
    const ships = shipsByWaterway[index];
    const militaryShips = ships.filter((ship) => shipTracker.isMilitary(ship));
    const tankerShips = ships.filter((ship) => shipTracker.isTanker(ship));

    return {
      waterway: region,
      label: SHIP_WATERWAY_LABELS[region],
      total: ships.length,
      military: militaryShips.length,
      tankers: tankerShips.length,
      samples: ships.slice(0, 5).map((ship: Ship) => ({
        name: ship.name || 'UNKNOWN',
        mmsi: ship.mmsi,
        type: ship.type,
        speed: Math.round(ship.speed),
        latitude: ship.latitude,
        longitude: ship.longitude,
        timestamp: ship.timestamp,
      })),
    };
  });
}

async function collectSatelliteSummary(
  includeSatellite: boolean,
  days: number,
): Promise<SatelliteSummary | undefined> {
  if (!includeSatellite) {
    return undefined;
  }

  if (!satelliteTracker.isEnabled()) {
    return {
      enabled: false,
      days,
      locations: [],
    };
  }

  const locations = satelliteTracker.getLocations();
  const imageryByLocation = await Promise.all(
    locations.map(async (location) => ({
      location: location.name,
      images: await satelliteTracker.getImagery(location, days),
    })),
  );

  return {
    enabled: true,
    days,
    locations: imageryByLocation
      .filter((entry) => entry.images.length > 0)
      .map((entry) => ({
        location: entry.location,
        imageCount: entry.images.length,
        latestTimestamp: entry.images[0]?.timestamp.toISOString() || null,
      })),
  };
}

async function buildSnapshot(
  options: CliOptions,
  dispatchAlerts: boolean,
): Promise<MonitorSnapshot> {
  // Wrap each promise to catch errors and return safe defaults
  const safePromise = async <T>(promise: Promise<T>, defaultValue: T, label: string): Promise<T> => {
    try {
      return await promise;
    } catch (error: any) {
      console.error(`[${label}] Error: ${error.message || error}`);
      return defaultValue;
    }
  };

  const [flightSummaries, news, social, internetResult, ships, satellite] = await Promise.all([
    safePromise(collectFlightSummaries(options.regions, dispatchAlerts), new Map() as Map<RegionName, FlightRegionSummary>, 'flights'),
    safePromise(newsAggregator.fetchAll(), [], 'news'),
    safePromise(socialMonitor.fetchAll(), [], 'social'),
    safePromise(internetMonitor.checkAll(), { connectivity: [], alerts: [] } as any, 'internet'),
    safePromise(collectShipSummaries(options.shipRegions), undefined, 'ships'),
    safePromise(collectSatelliteSummary(options.includeSatellite, options.satelliteDays), undefined, 'satellite'),
  ]);

  const regions = options.regions.map((region) => {
    const definition = getRegionDefinition(region);
    const flights = flightSummaries.get(region);

    if (!definition || !flights) {
      throw new Error(`Region snapshot missing for "${region}".`);
    }

    return {
      region,
      label: definition.label,
      description: definition.description,
      flights,
      internet: buildRegionInternetSummary(region, internetResult.connectivity, internetResult.alerts),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    requestedRegions: options.regions,
    sourceStatus: {
      telegram: telegramAlerter.isEnabled(),
      twitter: socialMonitor.isEnabled(),
      satelliteConfigured: satelliteTracker.isEnabled(),
      shipsConfigured: Boolean(process.env.AISSTREAM_API_KEY),
    },
    regions,
    news: news.slice(0, 10).map(serializeNews),
    social: social.slice(0, 10).map(serializeSocial),
    ...(ships ? { ships } : {}),
    ...(satellite ? { satellite } : {}),
  };
}

function printFlightSamples(title: string, flights: FlightSample[]): void {
  if (flights.length === 0) {
    return;
  }

  console.log(`  ${title}:`);
  for (const flight of flights) {
    console.log(
      `    ${flight.callsign.padEnd(10)} ${String(flight.altitude).padStart(7)}ft ${String(flight.speed).padStart(4)}kts ${flight.origin}`,
    );
  }
}

function printSnapshot(snapshot: MonitorSnapshot): void {
  console.log('');
  console.log(`Generated: ${snapshot.generatedAt}`);
  console.log(`Regions:   ${formatRegionList(snapshot.requestedRegions)}`);
  console.log(
    `Sources:   telegram=${snapshot.sourceStatus.telegram} twitter=${snapshot.sourceStatus.twitter} satellite=${snapshot.sourceStatus.satelliteConfigured}`,
  );

  for (const region of snapshot.regions) {
    console.log('');
    console.log(`${region.label} [${region.region}]`);
    console.log('-'.repeat(60));
    console.log(
      `Flights: total=${region.flights.total} military=${region.flights.military} emergency=${region.flights.emergency} alerts=${region.flights.alerts.length}`,
    );

    if (region.flights.alerts.length > 0) {
      for (const alert of region.flights.alerts.slice(0, 5)) {
        console.log(`  ALERT ${alert.type.toUpperCase()}: ${alert.message}`);
      }
    }

    printFlightSamples('Military', region.flights.militarySamples);
    printFlightSamples('Emergency', region.flights.emergencySamples);
    printFlightSamples('Active', region.flights.activeSamples);

    if (region.internet.monitored > 0) {
      console.log(`Internet: monitored=${region.internet.monitored} issues=${region.internet.issueCount}`);
      for (const status of region.internet.statuses.filter((item) => item.status !== 'normal')) {
        console.log(`  ${status.country}: ${status.status} (${status.changePercent}%)`);
      }
    } else {
      console.log('Internet: no regional connectivity mapping configured');
    }
  }

  if (snapshot.news.length > 0) {
    console.log('');
    console.log('News');
    console.log('-'.repeat(60));
    for (const item of snapshot.news.slice(0, 5)) {
      console.log(`  [${item.source}] ${trimText(item.title, 90)}`);
    }
  }

  if (snapshot.social.length > 0) {
    console.log('');
    console.log('Social');
    console.log('-'.repeat(60));
    for (const item of snapshot.social.slice(0, 5)) {
      console.log(`  [${item.platform}] ${trimText(item.text, 90)}`);
    }
  }

  if (snapshot.ships && snapshot.ships.length > 0) {
    console.log('');
    console.log('Ships');
    console.log('-'.repeat(60));
    for (const waterway of snapshot.ships) {
      console.log(
        `  ${waterway.label}: total=${waterway.total} military=${waterway.military} tankers=${waterway.tankers}`,
      );
    }
  }

  if (snapshot.satellite) {
    console.log('');
    console.log('Satellite');
    console.log('-'.repeat(60));
    if (!snapshot.satellite.enabled) {
      console.log('  Sentinel Hub credentials are not configured.');
    } else if (snapshot.satellite.locations.length === 0) {
      console.log('  No recent imagery found for configured locations.');
    } else {
      for (const location of snapshot.satellite.locations.slice(0, 5)) {
        console.log(
          `  ${location.location}: images=${location.imageCount} latest=${location.latestTimestamp}`,
        );
      }
    }
  }
}

function printRegionsList(json: boolean): void {
  const regions = listRegionDefinitions().map((region) => ({
    id: region.id,
    label: region.label,
    description: region.description,
    aliases: region.aliases,
    hasFlightBounds: Boolean(region.flightBounds),
    internetCountries: region.internetCountryCodes,
  }));

  if (json) {
    console.log(JSON.stringify(regions, null, 2));
    return;
  }

  console.log('Available region presets');
  console.log('------------------------');
  for (const region of regions) {
    console.log(`${region.id.padEnd(16)} ${region.label}`);
    console.log(`  ${region.description}`);
    console.log(`  Aliases: ${region.aliases.join(', ') || 'none'}`);
  }
}

function printUsage(): void {
  console.log('Usage:');
  console.log('  npm run watch -- [--regions middle_east,europe]');
  console.log(
    '  npm run snapshot -- [--json] [--regions middle_east,eastern_europe] [--ships all] [--satellite] [--days 3]',
  );
  console.log('  npm run regions -- [--json]');
  console.log('');
  console.log('Examples:');
  console.log('  npm run snapshot -- --json --regions middle_east,eastern_europe');
  console.log('  npm run snapshot -- --json --all-regions --ships strait_hormuz,persian_gulf');
  console.log('  npm run regions -- --json');
}

async function withMutedConsoleErrors<T>(task: () => Promise<T>): Promise<T> {
  const originalConsoleError = console.error;
  console.error = () => undefined;

  try {
    return await task();
  } finally {
    console.error = originalConsoleError;
  }
}

async function runSnapshotCommand(options: CliOptions): Promise<void> {
  const snapshot = options.json
    ? await withMutedConsoleErrors(() => buildSnapshot(options, false))
    : await buildSnapshot(options, false);

  if (options.json) {
    console.log(JSON.stringify(snapshot, null, 2));
    return;
  }

  printHeader();
  printSnapshot(snapshot);
}

async function runWatchCommand(options: CliOptions): Promise<void> {
  printHeader();
  printStatus(`Monitoring regions: ${formatRegionList(options.regions)}`);
  printStatus('Flights: OpenSky Network');
  printStatus('News: Reuters, Al Jazeera, AP');
  printStatus(
    `Social: ${socialMonitor.isEnabled() ? 'Twitter API + Reddit' : 'Reddit only (set TWITTER_BEARER_TOKEN for more)'}`,
  );
  printStatus(
    `Satellite: ${satelliteTracker.isEnabled() ? 'configured' : 'not configured (set SENTINEL_HUB credentials)'}`,
  );
  printStatus(`Telegram: ${telegramAlerter.isEnabled() ? 'enabled' : 'not configured'}`);

  if (telegramAlerter.isEnabled()) {
    await telegramAlerter.sendStartup(formatRegionList(options.regions));
  }

  sendShutdownNotice = true;

  const runPass = async (): Promise<void> => {
    const snapshot = await buildSnapshot(options, true);
    printSnapshot(snapshot);
    printStatus(`Next update in ${REFRESH_INTERVAL_MS / 1000} seconds...`);
  };

  await runPass();

  setInterval(() => {
    void runPass().catch((error: unknown) => {
      console.error(`Watch cycle failed: ${error instanceof Error ? error.message : String(error)}`);
    });
  }, REFRESH_INTERVAL_MS);
}

export function shouldSendShutdownNotice(): boolean {
  return sendShutdownNotice;
}

export async function runCli(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));

  switch (options.command) {
    case 'help':
      printUsage();
      return;
    case 'regions':
      printRegionsList(options.json);
      return;
    case 'snapshot':
      await runSnapshotCommand(options);
      return;
    case 'watch':
    default:
      await runWatchCommand(options);
      return;
  }
}

process.on('SIGINT', () => {
  void (async () => {
    console.log('\nClawdwatch shutting down...');
    if (shouldSendShutdownNotice() && telegramAlerter.isEnabled()) {
      await telegramAlerter.send('Clawdwatch going offline.');
    }
    process.exit(0);
  })();
});

if (require.main === module) {
  void runCli().catch((error: unknown) => {
    console.error('=== FATAL ERROR ===');
    console.error(error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  });
}
