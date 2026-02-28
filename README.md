<div align="center">

```
   ██████╗██╗      █████╗ ██╗    ██╗██████╗ ██╗    ██╗ █████╗ ████████╗ ██████╗██╗  ██╗
  ██╔════╝██║     ██╔══██╗██║    ██║██╔══██╗██║    ██║██╔══██╗╚══██╔══╝██╔════╝██║  ██║
  ██║     ██║     ███████║██║ █╗ ██║██║  ██║██║ █╗ ██║███████║   ██║   ██║     ███████║
  ██║     ██║     ██╔══██║██║███╗██║██║  ██║██║███╗██║██╔══██║   ██║   ██║     ██╔══██║
  ╚██████╗███████╗██║  ██║╚███╔███╔╝██████╔╝╚███╔███╔╝██║  ██║   ██║   ╚██████╗██║  ██║
   ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚═════╝  ╚══╝╚══╝ ╚═╝  ╚═╝   ╚═╝    ╚═════╝╚═╝  ╚═╝
```

<br>

### 🦀 THE ALL-SEEING OSINT AGENT

*"See what they don't want you to see"*

<br>

[![Status](https://img.shields.io/badge/STATUS-ACTIVE-red?style=flat-square&labelColor=000)](https://github.com/cloudweaver/clawdwatch)
[![Clawdbot](https://img.shields.io/badge/POWERED%20BY-CLAWDBOT-blue?style=flat-square&labelColor=000)](https://github.com/clawdbot/clawdbot)
[![License](https://img.shields.io/badge/LICENSE-MIT-green?style=flat-square&labelColor=000)](LICENSE)

</div>

---

## Special Thanks

Huge thanks to **Claude** ([@claude](https://github.com/claude)) for the foundational contributions to the agent architecture and intelligence correlation engine. This project wouldn't exist without that work.

---

## Why Now?

We're living through a critical moment. As the US-Iran conflict escalates, information becomes both a weapon and a casualty. Governments on all sides control narratives. Social media is flooded with propaganda. News outlets pick sides. Regular people — the ones actually affected by airstrikes, sanctions, and chaos — are left trying to figure out what's real.

During the 2020 Iran missile strikes, flight tracking enthusiasts on Twitter spotted diversions before news outlets reported anything. During Ukraine, OSINT researchers using public satellite imagery exposed troop movements that governments denied. Open-source intelligence isn't just for analysts anymore — it's how civilians protect themselves and each other.

**Clawdwatch exists because:**
- Mainstream media is slow and often biased
- Governments lie or withhold information
- Social media is full of propaganda and misinfo
- People in conflict zones deserve real-time, verified intel
- The tools exist — they just need to be connected

This is about democratizing situational awareness. If a missile is heading somewhere, if flights are diverting, if ships are going dark — people should know before it hits the news cycle.

---

## What is Clawdwatch?

**Clawdwatch** is an autonomous OSINT (Open Source Intelligence) agent that monitors, aggregates, and analyzes publicly available data from multiple sources — giving you real-time situational awareness during conflicts and global events.

No propaganda. No bias. Just data.

```
┌─────────────────────────────────────────────────────────────────┐
│  FLIGHT TRACKING      │  SHIP TRACKING       │  SATELLITE      │
├─────────────────────────────────────────────────────────────────┤
│  LIVE FEEDS           │  NEWS AGGREGATION    │  VERIFICATION   │
├─────────────────────────────────────────────────────────────────┤
│                    🦀 CLAWDWATCH AGENT                          │
│               Correlate → Analyze → Alert                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Features

**Multi-Source Monitoring**
- Flight Tracking — ADS-B Exchange, military aircraft movements
- Ship Tracking — AIS data, naval movements, tanker activity
- Satellite Imagery — Sentinel Hub integration
- Social Media — Twitter/X, Telegram, Reddit scraping
- News Feeds — Multi-language, multi-perspective

**AI-Powered Analysis**
- Anomaly Detection — Flags unusual patterns
- Correlation Engine — Connects dots across sources
- Propaganda Filter — Identifies manipulation techniques
- Auto-Summarization — Plain language briefings
- Verification — Cross-references claims

---

## Intelligence Sources

| Source | Type | Coverage | Update Rate |
|--------|------|----------|-------------|
| ADS-B Exchange | Flight | Global | Real-time |
| MarineTraffic | Naval | Global | Real-time |
| Sentinel Hub | Satellite | Global | Daily |
| Twitter/X | Social | Global | Real-time |
| Telegram | Social | Regional | Real-time |
| Reuters | News | Global | Hourly |
| Al Jazeera | News | MENA | Hourly |
| WebSDR | Radio | Regional | Real-time |

---

## Quick Start

```bash
git clone https://github.com/cloudweaver/clawdwatch.git
cd clawdwatch
npm install
cp .env.example .env
npm run watch
```

### Demo

<div align="center">
<img src="assets/demo.svg" alt="Clawdwatch Demo" width="700"/>
</div>

---

## Alert System

Clawdwatch pushes alerts when it detects:

- Military aircraft entering monitored airspace
- Ships disabling AIS transponders (going dark)
- Unusual flight pattern deviations
- Correlated activity across multiple sources
- Breaking news matching your watchlist

**Supported Channels:** Telegram, Discord, Email, SMS

---

## 🦀 Powered by Clawdbot

Clawdwatch runs on the [Clawdbot](https://github.com/clawdbot/clawdbot) agent framework — autonomous AI that actually does things.

```
┌──────────────────────────────────────────┐
│           🦀 CLAWDBOT CORE               │
├──────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  │
│  │ SCRAPER │→ │ ANALYZE │→ │  ALERT  │  │
│  └─────────┘  └─────────┘  └─────────┘  │
└──────────────────────────────────────────┘
```

---

## Roadmap

- [x] Project scaffolding
- [x] OpenSky Network flight tracking (LIVE)
- [ ] MarineTraffic integration
- [ ] Twitter/Telegram scrapers
- [ ] AI summarization pipeline
- [ ] Alert system (Telegram/Discord)
- [ ] Web dashboard with live map
- [ ] Satellite imagery analysis
- [ ] Mobile app

---

## Contributing

Built by the people, for the people. PRs welcome.

---

## Disclaimer

Clawdwatch aggregates **publicly available** information only. It does not access classified data, hack systems, or break any laws. This tool is for **informational purposes** — always verify critical information through official channels.

---

<div align="center">

*In the fog of war, be the one who sees clearly.*

🦀

</div>
