import axios from 'axios';

/**
 * src/alerts/defcon.ts
 * DEFCON Alert Handler — ClawdWatch Lobster Edition
 *
 * Consumes fetchDefconLevel() from intel.ts, applies threshold rules,
 * escalation/cooldown logic, and fires Telegram/Slack notifications.
 *
 * Wire into index.ts monitor loop or http.ts as a background scheduler.
 */

import { fetchDefconLevel, type DefconStatus } from '../sources/intel';

// ── Types ──────────────────────────────────────────────────────────────────────

export type DefconLevel = 1 | 2 | 3 | 4 | 5;

export interface DefconAlert {
  level: DefconLevel;
  previousLevel: DefconLevel | null;
  changeType: 'escalation' | 'de_escalation' | 'stable' | 'init';
  message: string;
  color: number;       // decimal RGB for Telegram
  timestamp: string;
}

export interface DefconThresholds {
  /** Minimum level to fire a Telegram alert (default: 4) */
  telegramMinLevel: DefconLevel;
  /** Minimum level to fire a Slack alert (default: 3) */
  slackMinLevel: DefconLevel;
  /** Cooldown between repeat alerts at the same level (ms, default: 30 min) */
  cooldownMs: number;
  /** Auto-escalate to next level after this many ms unacknowledged (default: 15 min) */
  escalationTimeoutMs: number;
  /** Poll interval (ms, default: 5 min) */
  pollIntervalMs: number;
}

export interface DefconalerterConfig {
  thresholds: Partial<DefconThresholds>;
  telegramToken?: string;
  telegramChatId?: string;
  slackWebhookUrl?: string;
}

// ── DEFCON Level Metadata ─────────────────────────────────────────────────────

interface DefconMeta {
  label: string;
  color: number;       // decimal RGB
  emoji: string;
  description: string;
  requiredActions: string[];
  channels: ('telegram' | 'slack')[];
  autoEscalate: boolean;
}

const DEFCON_META: Record<DefconLevel, DefconMeta> = {
  5: {
    label: 'DEFCON 5 — NORMAL',
    color: 0x22c55e,    // green
    emoji: '🟢',
    description: 'Normal peacetime readiness. No imminent threat. Standard monitoring posture.',
    requiredActions: [
      'Continue standard log monitoring',
      'Maintain routine patch management',
      'Review and update security documentation',
    ],
    channels: [],
    autoEscalate: false,
  },
  4: {
    label: 'DEFCON 4 — ELEVATED',
    color: 0x3b82f6,    // blue
    emoji: '🔵',
    description: 'Above normal readiness. Increased intelligence suggests possible threat activity. Heighten vigilance.',
    requiredActions: [
      'Increase log review frequency to every 2 hours',
      'Verify all monitoring systems are fully operational',
      'Review recent access logs for anomalies',
      'Notify Tier-2 SOC analysts of heightened awareness',
    ],
    channels: ['telegram'],
    autoEscalate: false,
  },
  3: {
    label: 'DEFCON 3 — ARMED FORCES READY',
    color: 0xeab308,    // yellow
    emoji: '🟡',
    description: 'Air Force ready to mobilize in 15 minutes. Terrorist attack possible. Heightened cyber activity expected.',
    requiredActions: [
      'Activate enhanced monitoring across all critical systems',
      'Notify Tier-3 analysts and incident response team',
      'Review and harden critical system access controls',
      'Prepare incident response playbooks for activation',
    ],
    channels: ['telegram', 'slack'],
    autoEscalate: true,
  },
  2: {
    label: 'DEFCON 2 — ARMED FORCES MOBILIZE',
    color: 0xf97316,    // orange
    emoji: '🟠',
    description: 'Armed forces mobilized. Terrorist attack likely. Critical infrastructure at high risk.',
    requiredActions: [
      'Activate full incident response team',
      'Implement emergency access controls and MFA enforcement',
      'Isolate non-critical systems from critical network segments',
      'Initiate active threat hunting procedures',
    ],
    channels: ['telegram', 'slack'],
    autoEscalate: true,
  },
  1: {
    label: 'DEFCON 1 — MAXIMUM FORCE READY',
    color: 0xef4444,    // red
    emoji: '🔴',
    description: 'Maximum readiness. Nuclear war or imminent armed attack in progress. ALL systems critical.',
    requiredActions: [
      'EXECUTE INCIDENT RESPONSE PLAN IMMEDIATELY',
      'Activate executive notification and crisis communication',
      'Initiate forensic preservation of affected systems',
      'Coordinate with law enforcement and CISA if breach confirmed',
    ],
    channels: ['telegram', 'slack'],
    autoEscalate: true,
  },
};

// ── Alert Formatter ───────────────────────────────────────────────────────────

function formatDefconAlert(alert: DefconAlert): string {
  const meta = DEFCON_META[alert.level];
  const changeLine =
    alert.changeType === 'escalation'
      ? `⚠️ ESCALATION: DEFCON ${alert.previousLevel} → DEFCON ${alert.level}`
      : alert.changeType === 'de_escalation'
      ? `✅ De-escalation: DEFCON ${alert.previousLevel} → DEFCON ${alert.level}`
      : alert.changeType === 'init'
      ? `🚀 DEFCON initialized at DEFCON ${alert.level}`
      : `➡️ DEFCON stable at DEFCON ${alert.level}`;

  const actionLines = meta.requiredActions.map((a) => `  • ${a}`).join('\n');

  return [
    `${meta.emoji} ${meta.label}`,
    ``,
    changeLine,
    ``,
    `📋 Situation:`,
    `> ${meta.description}`,
    ``,
    `🛡️ Required Actions:`,
    actionLines,
    ``,
    `🕐 ${alert.timestamp}`,
    ``,
    `Source: defconlevel.com | ClawdWatch Lobster Edition`,
  ].join('\n');
}

// ── Notification Dispatcher ───────────────────────────────────────────────────

async function sendTelegram(
  message: string,
  token?: string,
  chatId?: string,
  color?: number
): Promise<boolean> {
  if (!token || !chatId) return false;
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    await axios.post(url, {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });
    return true;
  } catch (err: any) {
    console.error('[DEFCON:Telegram]', err.message);
    return false;
  }
}

async function sendSlack(
  message: string,
  webhookUrl?: string
): Promise<boolean> {
  if (!webhookUrl) return false;
  try {
    await axios.post(webhookUrl, { text: message });
    return true;
  } catch (err: any) {
    console.error('[DEFCON:Slack]', err.message);
    return false;
  }
}

// ── Core DEFCON Alert Handler ─────────────────────────────────────────────────

export class DefconAlertHandler {
  private lastLevel: DefconLevel | null = null;
  private lastAlertMs = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private onAlertCallbacks: ((alert: DefconAlert) => void)[] = [];

  private readonly thresholds: DefconThresholds;

  constructor(private config: DefconalerterConfig) {
    this.thresholds = {
      telegramMinLevel: config.thresholds?.telegramMinLevel ?? 4,
      slackMinLevel: config.thresholds?.slackMinLevel ?? 3,
      cooldownMs: config.thresholds?.cooldownMs ?? 30 * 60 * 1000,
      escalationTimeoutMs: config.thresholds?.escalationTimeoutMs ?? 15 * 60 * 1000,
      pollIntervalMs: config.thresholds?.pollIntervalMs ?? 5 * 60 * 1000,
    };
  }

  /** Register a callback for every DEFCON alert (for external routing) */
  onAlert(cb: (alert: DefconAlert) => void) {
    this.onAlertCallbacks.push(cb);
  }

  /** Check DEFCON once — call this directly or use start() for the polling loop */
  async check(): Promise<DefconAlert | null> {
    const raw = await fetchDefconLevel();
    if (!raw) {
      console.warn('[DEFCON] fetchDefconLevel returned null — source unreachable');
      return null;
    }

    const level = raw.level as DefconLevel;
    if (!(level in DEFCON_META)) {
      console.warn(`[DEFCON] Unknown level: ${level}`);
      return null;
    }

    const now = Date.now();
    const changed = this.lastLevel !== level;
    const cooled = now - this.lastAlertMs >= this.thresholds.cooldownMs;
    const shouldEscalate = DEFCON_META[level].autoEscalate;
    const escalationTimeoutPassed =
      shouldEscalate && this.lastLevel !== null && now - this.lastAlertMs >= this.thresholds.escalationTimeoutMs;

    // Alert if: level changed, OR we're still escalating and cooldown passed
    if (!changed && !escalationTimeoutPassed && this.lastLevel !== null) {
      return null; // nothing new to report
    }

    this.lastLevel = level;
    this.lastAlertMs = now;

    const changeType: DefconAlert['changeType'] =
      !this.lastLevel || changed === false
        ? 'stable'
        : level < (this.lastLevel as DefconLevel)
        ? 'escalation'
        : 'de_escalation';

    const prevForAlert = changed ? (this.lastLevel as DefconLevel) : null;

    const alert: DefconAlert = {
      level,
      previousLevel: prevForAlert,
      changeType,
      message: formatDefconAlert({
        level,
        previousLevel: prevForAlert,
        changeType,
        message: '',
        color: DEFCON_META[level].color,
        timestamp: new Date().toISOString(),
      }),
      color: DEFCON_META[level].color,
      timestamp: new Date().toISOString(),
    };

    // Fire notifications
    const meta = DEFCON_META[level];

    if (level <= this.thresholds.telegramMinLevel) {
      const sent = await sendTelegram(
        alert.message,
        this.config.telegramToken,
        this.config.telegramChatId,
        meta.color
      );
      if (sent) console.log(`[DEFCON] Telegram alert sent: ${meta.label}`);
    }

    if (level <= this.thresholds.slackMinLevel) {
      const sent = await sendSlack(alert.message, this.config.slackWebhookUrl);
      if (sent) console.log(`[DEFCON] Slack alert sent: ${meta.label}`);
    }

    // Notify callbacks
    for (const cb of this.onAlertCallbacks) {
      try { cb(alert); } catch (err) { console.error('[DEFCON:callback]', err); }
    }

    return alert;
  }

  /** Start the polling loop */
  start() {
    console.log(`[DEFCON] Alert handler started — polling every ${this.thresholds.pollIntervalMs / 1000 / 60} min`);
    this.check(); // immediate first run
    this.intervalId = setInterval(() => this.check(), this.thresholds.pollIntervalMs);
  }

  /** Stop the polling loop */
  stop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[DEFCON] Alert handler stopped');
    }
  }

  /** Get current DEFCON level without firing alerts */
  async getLevel(): Promise<DefconLevel | null> {
    const raw = await fetchDefconLevel();
    return raw ? (raw.level as DefconLevel) : null;
  }
}

// ── Convenience factory ────────────────────────────────────────────────────────

export function createDefconHandler(env: Record<string, string | undefined>): DefconAlertHandler {
  return new DefconAlertHandler({
    thresholds: {
      telegramMinLevel: (parseInt(env.DEFCON_TELEGRAM_MIN_LEVEL || '4', 10) as DefconLevel) || 4,
      slackMinLevel: (parseInt(env.DEFCON_SLACK_MIN_LEVEL || '3', 10) as DefconLevel) || 3,
      cooldownMs: parseInt(env.DEFCON_COOLDOWN_MS || '', 10) || 30 * 60 * 1000,
      escalationTimeoutMs: parseInt(env.DEFCON_ESCALATION_TIMEOUT_MS || '', 10) || 15 * 60 * 1000,
      pollIntervalMs: parseInt(env.DEFCON_POLL_INTERVAL_MS || '', 10) || 5 * 60 * 1000,
    },
    telegramToken: env.TELEGRAM_BOT_TOKEN,
    telegramChatId: env.TELEGRAM_CHAT_ID,
    slackWebhookUrl: env.SLACK_DEFCON_WEBHOOK_URL,
  });
}
