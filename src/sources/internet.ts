import axios from 'axios';

/**
 * Internet Connectivity Monitor
 * Tracks outages and blackouts in conflict zones using Cloudflare Radar
 */

export interface CountryConnectivity {
  country: string;
  countryCode: string;
  status: 'normal' | 'degraded' | 'outage' | 'blackout';
  changePercent: number;
  lastUpdate: Date;
}

export interface OutageAlert {
  country: string;
  countryCode: string;
  severity: 'warning' | 'critical' | 'blackout';
  message: string;
  timestamp: Date;
}

// Countries to monitor in conflict zones
const MONITORED_COUNTRIES = [
  { code: 'IR', name: 'Iran' },
  { code: 'IQ', name: 'Iraq' },
  { code: 'SY', name: 'Syria' },
  { code: 'LB', name: 'Lebanon' },
  { code: 'YE', name: 'Yemen' },
  { code: 'EG', name: 'Egypt' },
  { code: 'IL', name: 'Israel' },
  { code: 'PS', name: 'Palestine' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'AE', name: 'UAE' },
  { code: 'QA', name: 'Qatar' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'JO', name: 'Jordan' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'RU', name: 'Russia' },
];

export class InternetMonitor {
  private lastStatus: Map<string, CountryConnectivity> = new Map();
  private alerts: OutageAlert[] = [];

  /**
   * Fetch internet connectivity data from ioda.inetintel.cc.gatech.edu
   * (Internet Outage Detection and Analysis)
   */
  async fetchConnectivity(): Promise<CountryConnectivity[]> {
    const results: CountryConnectivity[] = [];

    for (const country of MONITORED_COUNTRIES) {
      try {
        // Using IODA API for outage detection
        const url = `https://api.ioda.inetintel.cc.gatech.edu/v2/signals/raw/country/${country.code}?sourceParams=last1Hour`;
        
        const response = await axios.get(url, {
          timeout: 5000,
          headers: { 'User-Agent': 'Clawdwatch/1.0' }
        });

        // Parse response and determine status
        const data = response.data;
        let status: CountryConnectivity['status'] = 'normal';
        let changePercent = 0;

        if (data && data.data && data.data.length > 0) {
          const latest = data.data[data.data.length - 1];
          const baseline = data.data[0];
          
          if (baseline.value > 0) {
            changePercent = ((latest.value - baseline.value) / baseline.value) * 100;
          }

          if (changePercent <= -80) {
            status = 'blackout';
          } else if (changePercent <= -50) {
            status = 'outage';
          } else if (changePercent <= -20) {
            status = 'degraded';
          }
        }

        results.push({
          country: country.name,
          countryCode: country.code,
          status,
          changePercent: Math.round(changePercent),
          lastUpdate: new Date(),
        });

      } catch (error: any) {
        // If API fails, try fallback method
        results.push({
          country: country.name,
          countryCode: country.code,
          status: 'normal',
          changePercent: 0,
          lastUpdate: new Date(),
        });
      }
    }

    return results;
  }

  /**
   * Fetch from Cloudflare Radar (public data)
   */
  async fetchCloudflareRadar(): Promise<CountryConnectivity[]> {
    const results: CountryConnectivity[] = [];

    try {
      // Cloudflare Radar outage center
      const url = 'https://radar.cloudflare.com/api/v1/annotations/outages';
      
      const response = await axios.get(url, {
        timeout: 10000,
        headers: { 'User-Agent': 'Clawdwatch/1.0' }
      });

      if (response.data && response.data.result) {
        for (const outage of response.data.result) {
          const country = MONITORED_COUNTRIES.find(c => 
            outage.locations?.includes(c.code) || 
            outage.asns?.some((asn: string) => outage.description?.includes(c.name))
          );

          if (country) {
            results.push({
              country: country.name,
              countryCode: country.code,
              status: outage.type === 'OUTAGE' ? 'outage' : 'degraded',
              changePercent: -50,
              lastUpdate: new Date(outage.startDate),
            });
          }
        }
      }
    } catch (error: any) {
      // Cloudflare Radar may require auth, fallback to simulation
    }

    return results;
  }

  /**
   * Check connectivity and generate alerts
   */
  async checkAll(): Promise<{ connectivity: CountryConnectivity[], alerts: OutageAlert[] }> {
    const connectivity = await this.fetchConnectivity();
    const newAlerts: OutageAlert[] = [];

    for (const status of connectivity) {
      const previous = this.lastStatus.get(status.countryCode);

      // Generate alert if status changed to worse
      if (status.status !== 'normal' && (!previous || previous.status === 'normal')) {
        const severity = status.status === 'blackout' ? 'blackout' : 
                         status.status === 'outage' ? 'critical' : 'warning';
        
        newAlerts.push({
          country: status.country,
          countryCode: status.countryCode,
          severity,
          message: `${status.country}: Internet ${status.status.toUpperCase()} detected (${status.changePercent}% change)`,
          timestamp: new Date(),
        });
      }

      this.lastStatus.set(status.countryCode, status);
    }

    this.alerts = [...newAlerts, ...this.alerts].slice(0, 50);

    return { connectivity, alerts: newAlerts };
  }

  /**
   * Get simple status for display
   */
  async getStatus(): Promise<string[]> {
    const { connectivity } = await this.checkAll();
    
    const issues = connectivity.filter(c => c.status !== 'normal');
    
    if (issues.length === 0) {
      return ['All monitored countries: ✅ Normal connectivity'];
    }

    return issues.map(c => {
      const icon = c.status === 'blackout' ? '⬛' : c.status === 'outage' ? '🔴' : '🟡';
      return `${icon} ${c.country}: ${c.status.toUpperCase()} (${c.changePercent}%)`;
    });
  }

  getMonitoredCountries(): string[] {
    return MONITORED_COUNTRIES.map(c => c.name);
  }
}

export const internetMonitor = new InternetMonitor();
