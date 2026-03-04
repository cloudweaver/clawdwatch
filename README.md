<div align="center">

```
   ██████╗██╗      █████╗ ██╗    ██╗██████╗ ██╗    ██╗ █████╗ ████████╗ ██████╗██╗  ██╗
  ██╔════╝██║     ██╔══██╗██║    ██║██╔══██╗██║    ██║██╔══██╗╚══██╔══╝██╔════╝██║  ██║
  ██║     ██║     ███████║██║ █╗ ██║██║  ██║██║ █╗ ██║███████║   ██║   ██║     ███████║
  ██║     ██║     ██╔══██║██║███╗██║██║  ██║██║███╗██║██╔══██║   ██║   ██║     ██╔══██║
  ╚██████╗███████╗██║  ██║╚███╔███╔╝██████╔╝╚███╔███╔╝██║  ██║   ██║   ╚██████╗██║  ██║
   ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚═════╝  ╚══╝╚══╝ ╚═╝  ╚═╝   ╚═╝    ╚═════╝╚═╝  ╚═╝

      ███████╗ ██████╗ ██████╗ ███████╗    ███████╗██╗   ██╗██████╗ ███████╗██╗     ██╗██╗  ██╗
      ██╔════╝██╔═══██╗██╔══██╗██╔════╝    ██╔════╝██║   ██║██╔══██╗██╔════╝██║     ██║╚██╗██╔╝
      █████╗  ██║   ██║██████╔╝█████╗      ███████╗██║   ██║██████╔╝█████╗  ██║     ██║ ╚███╔╝
      ██╔══╝  ██║   ██║██╔══██╗██╔══╝      ╚════██║██║   ██║██╔══██╗██╔══╝  ██║     ██║ ██╔██╗
      ██║     ╚██████╔╝██║  ██║███████╗    ███████║╚██████╔╝██║  ██║███████╗███████╗███████╗██║██╔╝ ██╗
      ╚═╝      ╚═════╝ ╚═╝  ╚═╝╚══════╝    ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚═╝╚═╝  ╚═╝
```

<br>

### 🦀 CLAWDWATCH LOBSTER EDITION

*"See what they don't want you to see"*

<br>

## 🌐 [LIVE DASHBOARD](https://cloudweaver.github.io/clawdwatch/)

<br>

| | |
|:--|:--|
| 🟢 **HTTP API** | Port 3444 |
| ✈️ **Flights** | OpenSky (rate limited) |
| 📰 **News** | Reuters, Al Jazeera, AP |
| 🔍 **Search** | Brave Search |

<br>

[![Status](https://img.shields.io/badge/STATUS-ACTIVE-red?style=flat-square&labelColor=000)](https://github.com/Franzferdinan51/clawdwatch-lobster-edition)
[![HTTP API](https://img.shields.io/badge/HTTP%20API-Port%203444-blue?style=flat-square&labelColor=000)](https://github.com/Franzferdinan51/clawdwatch-lobster-edition)
[![LM Studio](https://img.shields.io/badge/LM%20Studio-MCP%20Ready-purple?style=flat-square&labelColor=000)](https://lmstudio.ai)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-Integrated-green?style=flat-square&labelColor=000)](https://openclaw.ai)
[![License](https://img.shields.io/badge/LICENSE-MIT-green?style=flat-square&labelColor=000)](LICENSE)

---

## 🌟 What's Working NOW

| Source | Status | Data |
|--------|--------|------|
| ✈️ **Flight Tracking** | ✅ LIVE | OpenSky Network — real-time flights (rate limited) |
| 📰 **News Aggregation** | ✅ LIVE | Reuters, Al Jazeera, AP News |
| 🌍 **Global Coverage** | ✅ LIVE | 21 regions worldwide |
| ⚔️ **Conflict Zones** | ✅ LIVE | 11 conflict regions tracked |
| 🌐 **HTTP API** | ✅ LIVE | Port 3444 |
| 🤖 **LM Studio MCP** | ✅ READY | Connect via HTTP |
| 📡 **OpenClaw** | ✅ INTEGRATED | Native skill available |

---

## 🚀 Quick Start

### Clone & Install
```bash
git clone https://github.com/Franzferdinan51/clawdwatch-lobster-edition.git
cd clawdwatch-lobster-edition
npm install
```

### HTTP API Server (Recommended)
```bash
npm run start
# Runs on http://localhost:3444
```

### CLI Mode
```bash
npm run watch    # Continuous monitoring
npm run snapshot # Get OSINT snapshot
npm run regions  # List regions
```

---

## 🌐 HTTP API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /status` | Service health check |
| `GET /regions` | List all 21 regions |
| `GET /flights` | Combined flight data (rate limited: 30s interval) |
| `GET /flights/:region` | Specific region flights |
| `GET /news` | News from Reuters, Al Jazeera, AP |
| `GET /osint` | Combined OSINT (flights + news) |
| `GET /conflict` | Conflict zone data (11 regions) |
| `GET /snapshot` | Quick OSINT summary |

### Example Usage
```bash
# Get status
curl http://localhost:3444/status

# Get conflict data
curl http://localhost:3444/conflict

# Get news
curl http://localhost:3444/news

# Get flights (rate limited - 30s interval)
curl http://localhost:3444/flights
```

---

## ⚠️ OpenSky Rate Limiting

OpenSky Network has rate limits for anonymous users:
- **400 credits/day** (free tier)
- **10 second data resolution**
- Cache is set to 10 minutes to respect limits

For higher limits, sign up at https://opensky-network.org/api/

---

## 🌍 Global Region Coverage

### Conflict Zones (11)
- Iran, Israel/Palestine, Lebanon, Syria, Iraq
- Yemen, Saudi Arabia, UAE, Qatar, Kuwait, Turkey

### Global Regions (21 Total)
- Middle East, Europe, Eastern Europe
- Central Asia, South Asia, East Asia
- Africa, North America, South America, Oceania

---

## 🤖 LM Studio MCP Integration

### Option 1: HTTP API Direct
Configure LM Studio to use the HTTP endpoint:
```
http://localhost:3444
```

### Option 2: MCP Config
Add to your `mcp.json`:
```json
{
  "mcpServers": {
    "clawdwatch": {
      "url": "http://localhost:3444"
    }
  }
}
```

---

## 📡 OpenClaw Integration

Native OpenClaw skill for AI agent access:

```bash
# Install skill
npx clawhub install clawdwatch

# Use in OpenClaw
npm run snapshot -- --json --regions middle_east
```

---

## 📰 News Sources

| Source | Status |
|--------|---------|
| Reuters | ✅ Working |
| Al Jazeera | ✅ Working |
| AP News | ✅ Working |

---

## ✈️ Flight Data

| Source | Status |
|--------|---------|
| OpenSky Network | ✅ Working (rate limited) |

**Note:** OpenSky Network has request limits. Caching is enabled to prevent rate limiting.

---

## 🔧 Configuration

```bash
# .env file
WATCH_REGION=middle_east

# Optional
TELEGRAM_BOT_TOKEN=xxx
TELEGRAM_CHAT_ID=xxx
TWITTER_BEARER_TOKEN=xxx
SENTINEL_HUB_CLIENT_ID=xxx
SENTINEL_HUB_CLIENT_SECRET=xxx
AISSTREAM_API_KEY=xxx
```

---

## 📂 Project Structure

```
clawdwatch-lobster-edition/
├── src/
│   ├── http.ts          # HTTP API server (port 3444)
│   ├── index.ts         # Main CLI entry
│   ├── cli.ts          # Command-line interface
│   └── sources/        # Data sources
│       ├── flights.ts
│       ├── news.ts
│       └── ...
├── skill/
│   └── SKILL.md        # OpenClaw skill
├── README.md
└── package.json
```

---

## 🛠️ Scripts

| Script | Description |
|--------|-------------|
| `npm run start` | Start HTTP API server |
| `npm run watch` | Run CLI in watch mode |
| `npm run snapshot` | Get OSINT snapshot |
| `npm run regions` | List available regions |

---

## 📜 License

MIT

---

## ⚠️ Disclaimer

Clawdwatch aggregates **publicly available** information only. This tool is for **informational purposes** — always verify critical information through official channels.

---

<div align="center">

*In the fog of war, be the one who sees clearly.*

🦀

</div>
