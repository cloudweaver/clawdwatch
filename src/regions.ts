export interface Bounds {
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
}

export type RegionName =
  | 'middle_east'
  | 'europe'
  | 'usa'
  | 'asia'
  | 'north_africa'
  | 'eastern_europe'
  | 'global';

export interface RegionDefinition {
  id: RegionName;
  label: string;
  description: string;
  flightBounds?: Bounds;
  internetCountryCodes: string[];
  aliases: string[];
}

const REGION_DEFINITIONS: Record<RegionName, RegionDefinition> = {
  middle_east: {
    id: 'middle_east',
    label: 'Middle East',
    description: 'Core Gulf and Levant monitoring preset.',
    flightBounds: { latMin: 12, latMax: 42, lonMin: 25, lonMax: 65 },
    internetCountryCodes: ['IR', 'IQ', 'SY', 'LB', 'YE', 'IL', 'PS', 'SA', 'AE', 'QA', 'BH', 'KW', 'JO'],
    aliases: ['me', 'gulf', 'levant'],
  },
  europe: {
    id: 'europe',
    label: 'Europe',
    description: 'Broad European airspace coverage.',
    flightBounds: { latMin: 35, latMax: 72, lonMin: -10, lonMax: 40 },
    internetCountryCodes: ['UA', 'RU'],
    aliases: ['eu', 'western_europe'],
  },
  usa: {
    id: 'usa',
    label: 'USA',
    description: 'Continental United States tracking window.',
    flightBounds: { latMin: 24, latMax: 50, lonMin: -125, lonMax: -66 },
    internetCountryCodes: [],
    aliases: ['us', 'united_states', 'conus'],
  },
  asia: {
    id: 'asia',
    label: 'Asia',
    description: 'Wide Asia-Pacific flight coverage.',
    flightBounds: { latMin: 5, latMax: 55, lonMin: 70, lonMax: 145 },
    internetCountryCodes: ['IR'],
    aliases: ['apac'],
  },
  north_africa: {
    id: 'north_africa',
    label: 'North Africa',
    description: 'Mediterranean south coast and Red Sea approach.',
    flightBounds: { latMin: 10, latMax: 38, lonMin: -17, lonMax: 38 },
    internetCountryCodes: ['EG'],
    aliases: ['nafrica', 'maghreb'],
  },
  eastern_europe: {
    id: 'eastern_europe',
    label: 'Eastern Europe',
    description: 'Focused Eastern Europe and Black Sea corridor.',
    flightBounds: { latMin: 40, latMax: 60, lonMin: 18, lonMax: 48 },
    internetCountryCodes: ['UA', 'RU'],
    aliases: ['ee', 'black_sea'],
  },
  global: {
    id: 'global',
    label: 'Global',
    description: 'No flight bounds filter; widest available OpenSky view.',
    internetCountryCodes: ['IR', 'IQ', 'SY', 'LB', 'YE', 'EG', 'IL', 'PS', 'SA', 'AE', 'QA', 'BH', 'KW', 'JO', 'UA', 'RU'],
    aliases: ['world', 'planet'],
  },
};

const DEFAULT_REGION: RegionName = 'middle_east';
const ALL_REGION_PRESETS: RegionName[] = [
  'middle_east',
  'europe',
  'usa',
  'asia',
  'north_africa',
  'eastern_europe',
];

function normalizeRegionValue(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function getRegionEntries(): RegionDefinition[] {
  return Object.values(REGION_DEFINITIONS);
}

export function listRegionDefinitions(): RegionDefinition[] {
  return getRegionEntries();
}

export function getRegionDefinition(value: string): RegionDefinition | undefined {
  const normalized = normalizeRegionValue(value);

  for (const region of getRegionEntries()) {
    if (region.id === normalized) {
      return region;
    }

    if (region.aliases.some((alias) => normalizeRegionValue(alias) === normalized)) {
      return region;
    }
  }

  return undefined;
}

export function resolveRegionInputs(values: string[]): RegionName[] {
  if (values.length === 0) {
    return [DEFAULT_REGION];
  }

  const resolved = new Set<RegionName>();

  for (const rawValue of values) {
    for (const token of rawValue.split(',')) {
      const normalized = normalizeRegionValue(token);

      if (!normalized) {
        continue;
      }

      if (normalized === 'all') {
        ALL_REGION_PRESETS.forEach((region) => resolved.add(region));
        continue;
      }

      const region = getRegionDefinition(normalized);
      if (!region) {
        throw new Error(
          `Unknown region "${token}". Run "npm run regions" to list valid presets.`,
        );
      }

      resolved.add(region.id);
    }
  }

  if (resolved.size === 0) {
    resolved.add(DEFAULT_REGION);
  }

  return Array.from(resolved);
}
