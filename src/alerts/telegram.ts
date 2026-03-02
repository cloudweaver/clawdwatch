import axios from 'axios';
import { FlightAlert } from '../sources/flights';

/**
 * Telegram Alert System
 * Pushes real-time alerts to Telegram chat
 */

export class TelegramAlerter {
  private botToken: string;
  private chatId: string;
  private enabled: boolean;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    this.chatId = process.env.TELEGRAM_CHAT_ID || '';
    this.enabled = !!(this.botToken && this.chatId);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Send a message to Telegram
   */
  async send(message: string, parseMode: 'HTML' | 'Markdown' = 'HTML'): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      await axios.post(url, {
        chat_id: this.chatId,
        text: message,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      });
      return true;
    } catch (error: any) {
      console.error('Telegram send error:', error.message);
      return false;
    }
  }

  /**
   * Format and send a flight alert
   */
  async sendFlightAlert(alert: FlightAlert): Promise<boolean> {
    const icons: Record<string, string> = {
      military: '🎖️',
      emergency: '🚨',
      diversion: '↩️',
      anomaly: '⚠️',
    };

    const icon = icons[alert.type] || '📡';
    const time = alert.timestamp.toLocaleTimeString();
    const f = alert.flight;

    const message = `
${icon} <b>CLAWDWATCH ALERT</b>

<b>Type:</b> ${alert.type.toUpperCase()}
<b>Callsign:</b> ${f.callsign}
<b>Altitude:</b> ${Math.round(f.altitude).toLocaleString()} ft
<b>Speed:</b> ${Math.round(f.speed)} kts
<b>Position:</b> ${f.latitude.toFixed(4)}, ${f.longitude.toFixed(4)}
<b>Squawk:</b> ${f.squawk || 'N/A'}

${alert.message}

🕐 ${time}
`.trim();

    return this.send(message);
  }

  /**
   * Send startup notification
   */
  async sendStartup(region: string): Promise<boolean> {
    const message = `
🦀 <b>CLAWDWATCH ONLINE</b>

Monitoring scope: <b>${region.toUpperCase()}</b>

Tracking:
• Military aircraft movements
• Emergency squawk codes
• Flight anomalies

Updates every 60 seconds.
`.trim();

    return this.send(message);
  }

  /**
   * Send summary of current activity
   */
  async sendSummary(totalFlights: number, militaryCount: number, emergencyCount: number, region: string): Promise<boolean> {
    if (militaryCount === 0 && emergencyCount === 0) {
      return true; // Don't spam with empty summaries
    }

    const message = `
📡 <b>CLAWDWATCH STATUS</b>

Region: ${region.toUpperCase()}
Total flights: ${totalFlights}
Military: ${militaryCount}
Emergency: ${emergencyCount}

🕐 ${new Date().toLocaleTimeString()}
`.trim();

    return this.send(message);
  }
}

export const telegramAlerter = new TelegramAlerter();
