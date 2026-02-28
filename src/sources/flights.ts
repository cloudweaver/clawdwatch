import axios from 'axios';

/**
 * Flight Tracking Source
 * Uses ADS-B Exchange and OpenSky Network for real-time flight data
 */

export interface Flight {
  icao: string;
  callsign: string;
  origin: string;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  heading: number;
  vertical_rate: number;
  on_ground: boolean;
  squawk: string;
  category: string;
  timestamp: number;
}

export interface FlightAlert {
  type: 'military' | 'diversion' | 'emergency' | 'anomaly';
  flight: Flight;
  message: string;
  timestamp: Date;
}

// Military callsign prefixes and patterns
const MILITARY_PATTERNS = [
  /^RCH/,    // US Air Force (Reach)
  /^DUKE/,   // US Air Force
  /^EVAC/,   // Medical evacuation
  /^JAKE/,   // US Air Force
  /^KING/,   // US Air Force rescue
  /^NERO/,   // US Navy
  /^NAVY/,   // US Navy
  /^TOPCAT/, // US Navy
  /^VIPER/,  // US Air Force
  /^RAF/,    // Royal Air Force
  /^RRR/,    // Royal Air Force
  /^IAM/,    // Italian Air Force
  /^GAF/,    // German Air Force
  /^FAF/,    // French Air Force
  /^IAF/,    // Israeli Air Force
  /^IRGC/,   // Iranian Revolutionary Guard
  /^IRIS/,   // Iran Air Force
  /^RSD/,    // Russian Air Force
  /^RF/,     // Russian Federation
];

// Emergency squawk codes
const EMERGENCY_SQUAWKS = ['7500', '7600', '7700'];

export class FlightTracker {
  private lastFlights: Map<string, Flight> = new Map();
  private alerts: FlightAlert[] = [];

  /**
   * Fetch flights from OpenSky Network (free, no API key required)
   * Bounding box: lat_min, lat_max, lon_min, lon_max
   */
  async fetchFlights(bounds?: { latMin: number; latMax: number; lonMin: number; lonMax: number }): Promise<Flight[]> {
    try {
      let url = 'https://opensky-network.org/api/states/all';
      
      if (bounds) {
        url += `?lamin=${bounds.latMin}&lamax=${bounds.latMax}&lomin=${bounds.lonMin}&lomax=${bounds.lonMax}`;
      }

      const response = await axios.get(url, { timeout: 10000 });
      
      if (!response.data || !response.data.states) {
        return [];
      }

      const flights: Flight[] = response.data.states.map((state: any[]) => ({
        icao: state[0] || '',
        callsign: (state[1] || '').trim(),
        origin: state[2] || '',
        latitude: state[6] || 0,
        longitude: state[5] || 0,
        altitude: state[7] || 0,
        speed: state[9] || 0,
        heading: state[10] || 0,
        vertical_rate: state[11] || 0,
        on_ground: state[8] || false,
        squawk: state[14] || '',
        category: state[17] || '',
        timestamp: response.data.time || Date.now() / 1000,
      }));

      return flights.filter(f => f.callsign && f.latitude && f.longitude);
    } catch (error: any) {
      console.error('Flight fetch error:', error.message);
      return [];
    }
  }

  /**
   * Check if a flight is military
   */
  isMilitary(flight: Flight): boolean {
    const callsign = flight.callsign.toUpperCase();
    return MILITARY_PATTERNS.some(pattern => pattern.test(callsign));
  }

  /**
   * Check if a flight has emergency squawk
   */
  isEmergency(flight: Flight): boolean {
    return EMERGENCY_SQUAWKS.includes(flight.squawk);
  }

  /**
   * Analyze flights and generate alerts
   */
  analyze(flights: Flight[]): FlightAlert[] {
    const newAlerts: FlightAlert[] = [];

    for (const flight of flights) {
      // Military aircraft detection
      if (this.isMilitary(flight)) {
        const existing = this.lastFlights.get(flight.icao);
        if (!existing) {
          newAlerts.push({
            type: 'military',
            flight,
            message: `Military aircraft detected: ${flight.callsign} at ${flight.altitude}ft`,
            timestamp: new Date(),
          });
        }
      }

      // Emergency squawk detection
      if (this.isEmergency(flight)) {
        newAlerts.push({
          type: 'emergency',
          flight,
          message: `EMERGENCY SQUAWK ${flight.squawk}: ${flight.callsign} at ${flight.altitude}ft`,
          timestamp: new Date(),
        });
      }

      // Update last known position
      this.lastFlights.set(flight.icao, flight);
    }

    this.alerts = [...this.alerts, ...newAlerts].slice(-100); // Keep last 100 alerts
    return newAlerts;
  }

  /**
   * Get flights in a specific region
   */
  async getRegion(region: 'middle_east' | 'europe' | 'usa' | 'asia'): Promise<Flight[]> {
    const bounds = {
      middle_east: { latMin: 12, latMax: 42, lonMin: 25, lonMax: 65 },
      europe: { latMin: 35, latMax: 72, lonMin: -10, lonMax: 40 },
      usa: { latMin: 24, latMax: 50, lonMin: -125, lonMax: -66 },
      asia: { latMin: 5, latMax: 55, lonMin: 70, lonMax: 145 },
    };
    
    return this.fetchFlights(bounds[region]);
  }

  /**
   * Get all recent alerts
   */
  getAlerts(): FlightAlert[] {
    return this.alerts;
  }
}

export const flightTracker = new FlightTracker();
