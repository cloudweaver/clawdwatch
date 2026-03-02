---
name: clawdwatch
description: "OSINT agent for real-time conflict intelligence — monitors flights, ships, satellites, social media, and news feeds."
---

# Clawdwatch Skill

Real-time open-source intelligence aggregation and analysis.

## Capabilities

- Monitor ADS-B flight data for military movements
- Track ship AIS data for naval activity
- Scrape social media for ground reports
- Aggregate news from multiple sources/languages
- AI-powered anomaly detection and correlation
- Push alerts via Telegram/Discord

## Usage

```bash
# Start monitoring
clawdwatch start

# Pull a JSON snapshot
npm run snapshot -- --json --regions middle_east,eastern_europe

# List regions
npm run regions -- --json

# Start the live watcher
npm run watch -- --regions middle_east
```

## Configuration

Set the following in your environment:

```bash
ADSB_EXCHANGE_API_KEY=xxx
MARINE_TRAFFIC_API_KEY=xxx
TELEGRAM_BOT_TOKEN=xxx
```
