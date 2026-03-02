import axios from 'axios';

/**
 * Satellite Imagery Source
 * Uses Sentinel Hub for satellite data
 */

export interface SatelliteImage {
  id: string;
  timestamp: Date;
  bounds: {
    latMin: number;
    latMax: number;
    lonMin: number;
    lonMax: number;
  };
  cloudCoverage: number;
  url: string;
  type: 'sentinel-2' | 'sentinel-1';
}

export interface LocationOfInterest {
  name: string;
  lat: number;
  lon: number;
  radius: number; // km
  type: 'military' | 'infrastructure' | 'port' | 'airbase';
}

// Key locations to monitor
const LOCATIONS: LocationOfInterest[] = [
  { name: 'Bandar Abbas Naval Base', lat: 27.1865, lon: 56.2808, radius: 10, type: 'port' },
  { name: 'Bushehr Nuclear Plant', lat: 28.8325, lon: 50.8875, radius: 5, type: 'infrastructure' },
  { name: 'Isfahan Nuclear Site', lat: 32.6539, lon: 51.6660, radius: 5, type: 'infrastructure' },
  { name: 'Natanz Enrichment Facility', lat: 33.7244, lon: 51.7275, radius: 5, type: 'infrastructure' },
  { name: 'Kharg Island Oil Terminal', lat: 29.2333, lon: 50.3167, radius: 5, type: 'infrastructure' },
  { name: 'Strait of Hormuz', lat: 26.5667, lon: 56.25, radius: 20, type: 'port' },
  { name: 'Al Udeid Air Base', lat: 25.1175, lon: 51.3150, radius: 10, type: 'airbase' },
  { name: 'Al Dhafra Air Base', lat: 24.2483, lon: 54.5475, radius: 10, type: 'airbase' },
  { name: 'USS Carrier Group (Persian Gulf)', lat: 26.5, lon: 52.0, radius: 50, type: 'military' },
];

export class SatelliteTracker {
  private clientId: string;
  private clientSecret: string;
  private accessToken: string = '';
  private tokenExpiry: number = 0;

  constructor() {
    this.clientId = process.env.SENTINEL_HUB_CLIENT_ID || '';
    this.clientSecret = process.env.SENTINEL_HUB_CLIENT_SECRET || '';
  }

  isEnabled(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  /**
   * Authenticate with Sentinel Hub
   */
  async authenticate(): Promise<boolean> {
    if (!this.isEnabled()) {
      return false;
    }

    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return true;
    }

    try {
      const response = await axios.post(
        'https://services.sentinel-hub.com/oauth/token',
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;
      return true;
    } catch (error: any) {
      console.error('Sentinel Hub auth error:', error.message);
      return false;
    }
  }

  /**
   * Get available imagery for a location
   */
  async getImagery(location: LocationOfInterest, days: number = 7): Promise<SatelliteImage[]> {
    if (!await this.authenticate()) {
      return [];
    }

    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      const bbox = this.getBoundingBox(location.lat, location.lon, location.radius);

      const response = await axios.post(
        'https://services.sentinel-hub.com/api/v1/catalog/search',
        {
          collections: ['sentinel-2-l2a'],
          datetime: `${fromDate.toISOString()}/${new Date().toISOString()}`,
          bbox: [bbox.lonMin, bbox.latMin, bbox.lonMax, bbox.latMax],
          limit: 5,
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.features?.map((f: any) => ({
        id: f.id,
        timestamp: new Date(f.properties.datetime),
        bounds: bbox,
        cloudCoverage: f.properties['eo:cloud_cover'] || 0,
        url: f.links?.find((l: any) => l.rel === 'thumbnail')?.href || '',
        type: 'sentinel-2' as const,
      })) || [];
    } catch (error: any) {
      console.error('Sentinel imagery error:', error.message);
      return [];
    }
  }

  /**
   * Calculate bounding box from center point and radius
   */
  getBoundingBox(lat: number, lon: number, radiusKm: number): { latMin: number; latMax: number; lonMin: number; lonMax: number } {
    const latDelta = radiusKm / 111; // ~111km per degree latitude
    const lonDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));
    
    return {
      latMin: lat - latDelta,
      latMax: lat + latDelta,
      lonMin: lon - lonDelta,
      lonMax: lon + lonDelta,
    };
  }

  /**
   * Get all monitored locations
   */
  getLocations(): LocationOfInterest[] {
    return LOCATIONS;
  }

  /**
   * Check for recent imagery at all locations
   */
  async checkAllLocations(): Promise<Map<string, SatelliteImage[]>> {
    const results = new Map<string, SatelliteImage[]>();

    for (const location of LOCATIONS) {
      const images = await this.getImagery(location, 3);
      if (images.length > 0) {
        results.set(location.name, images);
      }
    }

    return results;
  }
}

export const satelliteTracker = new SatelliteTracker();
