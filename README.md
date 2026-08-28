<div align="center">

```
   ██████╗██╗      █████╗ ██╗    ██╗██████╗ ██╗    ██╗ █████╗ ████████╗ ██████╗██╗  ██╗
  ██╔════╝██║     ██╔══██╗██║    ██║██╔══██╗██║    ██║██╔══██╗╚══██╔══╝██╔════╝██║  ██║
  ██║     ██║     ███████║██╗ ██║██║  ██║██╗ ██║███████║   ██║   ██║     ███████║
  ██║     ██║     ██╔══██║██║███╗██║██║  ██║██║███╗██║██╔══██║   ██║   ██║     ██╔══██║
  ╚██████╗███████╗██║  ██║╚███╔███╔╝██████╔╝╚███╔███╔╝██║  ██║   ██║   ╚██████╗██║  ██║
   ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚═════╝  ╚══╝╚══╝ ╚═╝  ╚═╝   ╚═╝    ╚═════╝╚═╝  ╚═╝

      ███████╗ ██████╗ ██████╗ ███████╗    ███████╗██╗   ██╗██████╗ ███████╗██╗     ██╗██╗  ██╗
      ██╔════╝██╔═══██╗██╔══██╗██╔════╝    ██╔════╝██║   ██║██╔══██╗██╔════╝██║     ██║╚██╗██╔╝
      █████╗  ██║   ██║██████╔╝█████╗      ███████╗██║   ██║██████╔╝█████╗  ██║     ██║ ╚███╔╝
      ██╔══╝  ██║   ██║██╔══██╗██╔══╝      ╚════██║██║   ██║██╔══██╗██╔══╝  ██║     ██║ ██╔██╗
      ██║     ╚██████╔╝██║  ██║███████╗    ███████║╚██████╔╝██║  ██║███████╗███████╗███████╗██║ ██╔╝
      ╚═╝      ╚═════╝ ╚═╝  ╚═╝╚══════╝    ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝
```

<br>

### 🦀 CLAWDWATCH LOBSTER EDITION — v2.5

*"See what they don't want you to see — everywhere on Earth"*

<br>

| | |
|:--|:--|
| 🟢 **HTTP API** | Port 3444, JSON |
| 🌍 **Coverage** | Truly global — **62 regions** across 6 continents |
| 🛰 **Endpoints** | 39 (Intel + RECON + OSIRIS-derived) |
| ✈️ **Flights** | OpenSky Network (global) |
| 📰 **News** | 31 RSS feeds, global |
| 🌋 **Disasters** | USGS earthquakes, GDACS global alerts |
| 🌦 **Weather** | NOAA NWS, Open-Meteo |
| 🔌 **MCP** | LM Studio ready |
| 🔐 **API keys** | All optional — nothing required |

<br>

[![Status](https://img.shields.io/badge/STATUS-ACTIVE-red?style=flat-square&labelColor=000)](https://github.com/Franzferdinan51/clawdwatch-lobster-edition)
[![HTTP API](https://img.shields.io/badge/HTTP%20API-Port%203444-blue?style=flat-square&labelColor=000)](https://github.com/Franzferdinan51/clawdwatch-lobster-edition)
[![Version](https://img.shields.io/badge/VERSION-2.5.0--lobster-orange?style=flat-square&labelColor=000)](https://github.com/Franzferdinan51/clawdwatch-lobster-edition)
[![Based on](https://img.shields.io/badge/BASED%20ON-cloudweaver%2Fclawdwatch-purple?style=flat-square&labelColor=000)](https://github.com/cloudweaver/clawdwatch)
[![OSIRIS](https://img.shields.io/badge/INSPIRED%20BY-OSIRIS%20%2F%20simplifaisoul-cyan?style=flat-square&labelColor=000)](https://github.com/simplifaisoul/osiris)
[![License](https://img.shields.io/badge/LICENSE-MIT-green?style=flat-square&labelColor=000)](LICENSE)

---

## 🌊 Provenance

ClawdWatch Lobster Edition is **a fork** of [cloudweaver/clawdwatch](https://github.com/cloudweaver/clawdwatch) — "the all-seeing OSINT agent" — extended with:

- 🛰️ **15 OSIRIS-derived endpoints** ported from [simplifaisoul/osiris](https://github.com/simplifaisoul/osiris) (the MIT-licensed Palantir alternative)
- 🔒 **Feature toggles** so endpoints can be enabled/disabled per-deployment
- 🔍 **RECON Toolkit** (SSL/TLS inspector, live broadcast network, OFAC auto-flag, opt-in port scanner)
- 🦞 **Lobster integration** with Desktop Control for full OS automation

> *"In the fog of war, be the one who sees clearly."*

---

## 🚀 Quick Start

```bash
git clone https://github.com/Franzferdinan51/clawdwatch-lobster-edition.git
cd clawdwatch-lobster-edition
npm install
cp .env.example .env       # optional — all keys are opt-in
npm run start              # HTTP API on http://localhost:3444
```

First sanity check:

```bash
curl http://localhost:3444/status
```

---

## 🎯 How It's Used

ClawdWatch is **not a dashboard**. It's an HTTP API consumed by agents and humans:

```bash
# One-shot global OSINT brief (~10s)
curl http://localhost:3444/osint | jq '.summary'

# Flights over a region
curl http://localhost:3444/flights/japan

# Earthquakes M4.5+ last 24h
curl 'http://localhost:3444/earthquakes?min=4.5'

# WHOIS + auto OFAC cross-check
curl http://localhost:3444/whois/example.com

# IP geolocation (3-provider cascade)
curl 'http://localhost:3444/geo?ip=8.8.8.8'

# Trace a BTC wallet (with OFAC flag)
curl http://localhost:3444/crypto/btc/1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa

# SSL/TLS cert chain
curl http://localhost:3444/ssl/github.com
```

**Pattern:** the agent calls endpoints, parses JSON, presents to the user in chat. Same UX whether you use Hermes, OpenClaw, Claude Code, or curl.

---

## 🌐 HTTP API Endpoints

### Core

| Endpoint | Description |
|----------|-------------|
| `GET /` | Index of every registered endpoint |
| `GET /status` | Service health (regions, feeds, cache, key status) |
| `GET /regions` | All 62 regions with lat/lon bounds, groups, priority |

### Flights (OpenSky)

| Endpoint | Description |
|----------|-------------|
| `GET /flights` | Aggregate counts across 20 priority regions |
| `GET /flights/all` | Every defined region (62 queries, slower) |
| `GET /flights/:region` | Single region by id or alias (e.g. `/flights/me`, `/flights/jp`) |
| `GET /flights/global` | Whole-world OpenSky query |

### News (31 RSS feeds)

| Endpoint | Description |
|----------|-------------|
| `GET /news` | All feeds, deduped, sorted newest first |
| `GET /news/:region` | Filter by region (`world`, `middle_east`, `asia`, `europe`, `south_asia`, `russia`, `eastern_europe`, `africa`, `israel`, `tech`, `oceania`) |
| `GET /news/sources` | List all configured feeds |
| `GET /news/health` | Per-source OK/error status |
| `GET /news/live` | 🆕 24/7 live broadcast catalog (NBC, CBS, ABC, Bloomberg, Sky News, Al Jazeera, NHK, WION, +7 more) |

### Intel (earthquakes, weather, disasters, DEFCON)

| Endpoint | Description |
|----------|-------------|
| `GET /earthquakes?min=4.0` | USGS M2.5+ last 24h, min magnitude filter |
| `GET /gdacs` | Global Disaster Alert and Coordination System events |
| `GET /weather/us` | NOAA NWS active US alerts |
| `GET /weather?lat=&lon=` | Current weather from Open-Meteo |
| `GET /defcon` | Current DEFCON level (defconlevel.com, 15-min cache) |
| `GET /defcon/score` | Numeric DEFCON score for dashboards |

### Aggregates

| Endpoint | Description |
|----------|-------------|
| `GET /osint` | Global situational summary (one call, ~21k flights + earthquakes + news + weather) |
| `GET /snapshot` | Cheaper variant for daily briefs |
| `GET /conflict` | Backward-compatible conflict summary (global, not just ME) |

### 🛰️ OSIRIS-Derived Intel (v2.2+) — no API key required

| Endpoint | Description |
|----------|-------------|
| `GET /dns/:domain` | Full DNS resolution (A, AAAA, MX, NS, TXT, CNAME) via Google DoH |
| `GET /whois/:domain` | RDAP/WHOIS lookup (with auto OFAC flag if cache populated) |
| `GET /cve/:id` | NVD CVE detail (e.g. `/cve/CVE-2021-44228` for Log4Shell) |
| `GET /cve/recent?days=7` | Recent CVEs from NVD |
| `GET /telegram/:channel` | Public Telegram channel recent messages (e.g. `/telegram/durov`) |
| `GET /crypto/btc/:address` | BTC address trace via blockstream.info (with OFAC flag) |
| `GET /crypto/eth/:address` | ETH address trace via Blockscout (with OFAC flag) |
| `GET /space-weather` | 🆕 NOAA SWPC Kp index, solar flares, geomagnetic alerts |
| `GET /sentinel?lat=&lng=` | 🆕 Sentinel-1/2 satellite imagery search (Element84 STAC) |
| `GET /satellites?category=` | 🆕 Celestrak TLE catalog (stations, weather, starlink, etc.) |
| `GET /cyber-threats?days=` | 🆕 CISA Known Exploited Vulnerabilities |
| `GET /geo?ip=` | 🆕 IP geolocation (3-provider cascade: ipapi.co → freeipapi.com → ipwho.is) |
| `GET /air-quality` | 🆕 Open-Meteo current AQI for 22 major global cities |

### 🔍 RECON Toolkit (v2.4) — no API key required

| Endpoint | Description |
|----------|-------------|
| `GET /ssl/:host` | SSL/TLS cert chain inspector (subject, issuer, validity, fingerprints, SANs, expiry warnings) |
| `GET /news/live` | 15 global 24/7 broadcaster streams (NBC, CBS, ABC, Bloomberg, Sky, Al Jazeera, NHK, WION, +7) |
| `GET /ofac/check?q=` | Single-value OFAC SDN cross-check (returns null without API key) |
| `POST /ofac/refresh` | Reload OFAC cache from OpenSanctions (requires API key) |
| `GET /scan?host=&ports=` | 🔒 TCP port scanner with banner grab + SSRF guards (default OFF) |

### 🔐 OSIRIS-Derived Intel — requires API key (toggle-controlled)

| Endpoint | Need | Free? |
|----------|------|-------|
| `GET /sanctions?q=` | `SANCTIONS_ENABLED=true` + `OPENSANCTIONS_API_KEY` | Free signup at opensanctions.org |
| `GET /fires?hours=` | `FIRES_ENABLED=true` + `FIRMS_MAP_KEY` | Free signup at firms.modaps.eosdis.nasa.gov |

---

## 🔒 Feature Toggles

Every optional endpoint can be disabled/enabled per-deployment via env. **Default is conservative — nothing is exposed that you don't explicitly want.**

| Toggle | Default | Gates |
|--------|---------|-------|
| `SANCTIONS_ENABLED` | `false` | `/sanctions` endpoint |
| `FIRES_ENABLED` | `false` | `/fires` endpoint |
| `PORT_SCAN_ENABLED` | `false` | `/scan` endpoint (with SSRF guards) |
| `PORT_SCAN_ALLOW_PRIVATE` | `false` | Allow scanning private/loopback IPs |
| `OPENSANCTIONS_API_KEY` | (unset) | OFAC cache + auto-flag in whois/geo/crypto |
| `FIRMS_MAP_KEY` | (unset) | `/fires` real data |

**OFAC auto-flag behavior** (when key is missing):
- `/whois`, `/geo`, `/crypto/*` still work
- `ofac_sanctioned` field is `null` (not `false`)
- Tooltip in response: "OFAC check unavailable (no API key or empty cache)"

**Port scanner behavior** (default OFF):
- Without `PORT_SCAN_ENABLED=true`: `/scan` returns clear "disabled" message
- With flag enabled: blocks private/loopback/link-local/multicast IPs by default
- Set `PORT_SCAN_ALLOW_PRIVATE=true` to override SSRF guards
- 31-port default scan + service fingerprinting via banner grab

### OpenSanctions setup

`/sanctions`, `/ofac/check`, `/ofac/refresh`, and the `ofac_sanctioned` field in `/whois`, `/geo`, `/crypto/*` all need an OpenSanctions data source. Two paths:

**Path A — hosted API key (5 min setup, default):**

1. Sign up free at https://opensanctions.org/
2. Open the API dashboard: https://opensanctions.org/api/
3. Click **Generate API key** → copy the 40-char string
4. Paste in `.env`:
   ```
   OPENSANCTIONS_API_KEY=<your-key-here>
   ```
5. Restart the server. `GET /ofac/refresh` will populate the cache; `ofac_sanctioned` fields will then populate in whois/geo/crypto responses.

**Path B — fully on-premise (no third-party, no rate limits):**

OpenSanctions publishes the full dataset and a self-hostable API server called **yente**. You can run it offline. Docs: https://www.opensanctions.org/docs/on-premise/

- **Bulk download** (CSV/JSON → SQLite/Postgres):
  ```bash
  pip install opensanctions
  opensanctions build datasets.yml       # ~6 GB download + index
  ```
- **Local API server** (Docker, same interface as the hosted one):
  ```bash
  docker run -d -p 8000:8000 \
    -e YENTE_API_KEY=anything \
    -e YENTE_DATABASE_URI=sqlite:///opensanctions.db \
    ghcr.io/opensanctions/yente:latest
  ```
  Then point `OPENSANCTIONS_BASE_URL=http://localhost:8000` in `.env` and update the base URL inside `sanctionsLookup()` in `src/sources/osiris.ts`.

On-prem is heavier to set up but gives you: zero rate limits, full historical snapshot (not just current SDN list), and air-gapped operation (good for sensitive investigations).

---

## 🌍 Global Region Coverage (62 regions)

ClawdWatch is **truly global**, not region-biased. 62 regions across 6 continents:

| Group | Count | Regions |
|-------|-------|---------|
| **Continental** | 6 | `europe` · `north_america` · `south_america` · `africa` · `asia` · `oceania` |
| **Americas** | 9 | `usa` · `canada` · `mexico` · `caribbean` · `brazil` · `argentina` · `venezuela` · `colombia` · `cuba` |
| **Europe** | 7 | `eastern_europe` · `british_isles` · `mediterranean` · `scandinavia` · `poland` · `greece` · `spain` |
| **Middle East / Gulf** | 13 | `middle_east` · `iran` · `israel` · `lebanon` · `syria` · `iraq` · `yemen` · `saudi_arabia` · `uae` · `qatar` · `kuwait` · `oman` · `turkey` |
| **Asia** | 12 | `central_asia` · `south_asia` · `east_asia` · `southeast_asia` · `china` · `japan` · `korea` · `india` · `vietnam` · `indonesia` · `philippines` · `myanmar` |
| **Africa** | 11 | `north_africa` · `west_africa` · `east_africa` · `southern_africa` · `sudan` · `nigeria` · `ethiopia` · `drc` · `kenya` · `tanzania` · `south_africa` |
| **Oceania** | 3 | `australia` · `new_zealand` · `papua_new_guinea` |

All regions support aliases (e.g. `me`, `gulf`, `levant`, `ksa`, `apac`, `nafrica`, `jp`).

---

## 📰 News Sources (31 feeds)

| Source | Region | Notes |
|--------|--------|-------|
| BBC World | world | Direct RSS |
| The Guardian World | world | Direct RSS |
| NYT World | world | Direct RSS |
| Reuters | world | via Google News proxy (Reuters blocks scrapers) |
| AP News | world | via Google News proxy |
| CNN World | world | via Google News proxy |
| Al Jazeera | world | Direct RSS |
| France 24 | world | Direct RSS |
| Deutsche Welle | world | Direct RSS |
| NPR World | world | Direct RSS |
| CBS News | world | Direct RSS |
| ABC News | world | Direct RSS |
| Politico | world | Direct RSS with Google News fallback |
| LA Times | world | Direct RSS |
| The Straits Times | world | Direct RSS |
| The Independent | world | Direct RSS |
| Times of Israel | israel | Direct RSS with Google News fallback |
| Middle East Eye | middle_east | Direct RSS with `/rss.xml` fallback |
| i24 News | israel | Direct RSS |
| Jerusalem Post | israel | Direct RSS |
| VOA Middle East | middle_east | Direct RSS |
| Kyiv Independent | eastern_europe | via Google News proxy |
| TASS | russia | Direct RSS |
| South China Morning Post | asia | Direct RSS |
| Kyodo News | asia | via Google News proxy |
| Times of India | south_asia | Direct RSS |
| The Hindu | south_asia | Direct RSS |
| Indian Express | south_asia | Direct RSS |
| ABC News Australia | oceania | Direct RSS |
| Reuters Tech | tech | via Google News proxy |

Check live status: `GET /news/health`

### 📺 Live 24/7 Broadcasters (`GET /news/live`)

15 streams from major global networks with `embed_allowed` flag for iframe-friendly ones:

| Broadcaster | City | Country | Embed |
|-------------|------|---------|-------|
| NBC News NOW | New York | US | external |
| CBS News 24/7 | New York | US | external |
| ABC News Live | New York | US | external |
| Bloomberg TV | New York | US | external |
| C-SPAN | Washington DC | US | external |
| CBC News | Toronto | CA | external |
| Sky News | London | GB | ✅ embed |
| France 24 EN | Paris | FR | ✅ embed |
| DW News | Berlin | DE | ✅ embed |
| Al Jazeera EN | Doha | QA | ✅ embed |
| NHK World | Tokyo | JP | ✅ embed |
| CNA 24/7 | Singapore | SG | ✅ embed |
| WION | New Delhi | IN | ✅ embed |
| CGTN | Beijing | CN | external |
| RT News | Moscow | RU | external (Rumble) |

---

## ⚠️ OpenSky Rate Limiting

OpenSky Network free tier: **400 credits/day**, **10s resolution**. ClawdWatch uses:

- **5-minute cache** per region URL
- **10-second minimum interval** between OpenSky calls
- **429-aware retry** with 15s backoff

For higher limits, sign up at https://opensky-network.org/api/ and set `OPENSKY_API_KEY` env var.

---

## 🤖 LM Studio MCP Integration

Add to `~/.lmstudio/mcp.json`:

```json
{
  "mcpServers": {
    "clawdwatch": {
      "command": "C:\\Program Files\\nodejs\\node.exe",
      "args": [
        "C:\\Users\\franz\\Desktop\\clawdwatch-lobster-edition\\mcp-clawdwatch\\index.mjs"
      ]
    }
  }
}
```

Install the MCP server dependency once from the repository root:

```bash
npm install --prefix mcp-clawdwatch
```

The MCP server proxies to `http://localhost:3444` and **auto-syncs its tool catalog from the live server's `/` endpoint on every startup**. Whatever endpoints the server exposes, MCP exposes as `clawdwatch_*` tools — no manual catalog maintenance needed. 38 tools as of v2.5 (`clawdwatch_status`, `clawdwatch_flights`, `clawdwatch_osint`, `clawdwatch_whois`, `clawdwatch_geo`, `clawdwatch_sslInspect`, `clawdwatch_scan`, `clawdwatch_liveNews`, `clawdwatch_ofacCheck`, ...). Override the backend URL with the `CLAWDWATCH_URL` env var.

**Lobster bonus:** with [Desktop Control Lobster](https://github.com/Franzferdinan51/clawdwatch-lobster-edition) you can chain MCP tool output to direct mouse/keyboard automation of any desktop app or Android device.

---

## 🔧 Configuration

```bash
cp .env.example .env
```

All keys are **optional**. The server runs without any of them. Add keys to unlock:

| Env var | Endpoint(s) unlocked | Cost |
|---------|---------------------|------|
| `OPENSKY_API_KEY` | Higher OpenSky rate limits | Free |
| `OPENSANCTIONS_API_KEY` | `/sanctions` + OFAC auto-flag in whois/geo/crypto | Free |
| `FIRMS_MAP_KEY` | `/fires` (NASA FIRMS hotspots) | Free |
| `PORT_SCAN_ENABLED=true` | `/scan` (TCP port scanner) | — |
| `MEMPOOL_SPACE_URL` | BTC fee estimates in `/crypto/btc` | Free |

---

## 📂 Project Structure

```
clawdwatch-lobster-edition/
├── src/
│   ├── http.ts           # HTTP API server (port 3444) — all 34 routes
│   ├── regions.ts        # 62 region definitions (lat/lon, group, priority)
│   ├── index.ts          # Main CLI entry
│   ├── cli.ts            # Command-line interface
│   ├── alerts/
│   │   └── telegram.ts   # Telegram alert dispatcher
│   ├── sources/
│   │   ├── flights.ts    # OpenSky + ADS-B Exchange flight logic
│   │   ├── news.ts       # News aggregator base class
│   │   ├── rss.ts        # RSS/Atom feed parser + 30-feed registry
│   │   ├── intel.ts      # USGS, GDACS, NWS, Open-Meteo, DEFCON
│   │   ├── osiris.ts     # 🆕 15 OSIRIS-derived sources (DNS, WHOIS, CVE,
│   │   │                 #     crypto, fires, sanctions, telegram, space-weather,
│   │   │                 #     sentinel, satellites, cyber-threats, geo, air-quality,
│   │   │                 #     SSL, live news, OFAC cache, port scanner)
│   │   ├── ships.ts      # AIS Stream ship tracking
│   │   ├── satellite.ts  # Sentinel Hub
│   │   ├── social.ts     # Twitter/X social signals
│   │   └── internet.ts   # NetBlocks connectivity
│   └── ARCHITECTURE.md   # Detailed module breakdown
├── mcp-clawdwatch/       # MCP server for LM Studio
│   └── index.mjs
├── skill/                # OpenClaw / Hermes skill manifest
├── skills/               # Lobster desktop control skill
├── scripts/              # OS-specific installers + test harness
│   └── test-endpoints.js # 🆕 Smoke-tests all 39 endpoints
├── .env.example          # 🆕 Documented toggle + key reference
├── docs/                 # Architecture, ADRs, design notes
├── README.md
└── package.json
```

---

## 🛠️ Scripts

| Command | What it does |
|---------|-------------|
| `npm run start` | Start HTTP API on port 3444 |
| `npm run http` | Same as `npm run start` |
| `npm run dev` | Nodemon-watched dev mode |
| `npm run watch` | CLI continuous monitoring |
| `npm run snapshot` | One-shot OSINT snapshot to console |
| `npm run regions` | List regions with bounds |
| `npm run build` | Compile TypeScript |
| `npm run test:e2e` | 🆕 Smoke-test all 39 endpoints (needs server running) |

---

## 🔄 What Changed (v2.2 → v2.5)

### v2.5 — Regions expansion + CLI rewrite
**+18 regions** (44 → 62) filling real coverage gaps across all continents: Sudan, Nigeria, Ethiopia, DR Congo, Kenya, Tanzania, South Africa; Poland, Greece, Spain; Vietnam, Indonesia, Philippines, Myanmar; Venezuela, Colombia, Cuba; Papua New Guinea. Country-level granularity for high-traffic OSINT theaters. Each region has full lat/lon bounds for OpenSky queries, descriptive metadata, and aliases (`me`, `jp`, `pl`, `vn`, etc). **CLI rewritten from scratch** (`src/cli.ts`): the old version referenced dead `RegionName`/`getRegionDefinition`/`listRegionDefinitions`/`resolveRegionInputs` symbols and failed `npx tsc --noEmit`. New CLI is a thin HTTP client (`npm run regions`, `npm run snapshot -- --region X`) so it can't drift from the server. **MCP server auto-sync** (this release — 6 hardcoded tools → 37 live tools). **OpenSanctions setup docs** added with both hosted (5 min) and on-prem (Docker yente) paths.

### v2.2 — OSIRIS integration (initial)
Added 9 OSIRIS-derived endpoints: sanctions, crypto, fires, CVE, WHOIS, DNS, Telegram. Toggle-controlled for features needing API keys.

### v2.3 — Global intel expansion
Added 6 free, no-key endpoints: space-weather (NOAA SWPC), sentinel (Element84 STAC satellite imagery), satellites (Celestrak TLE catalog), cyber-threats (CISA KEV), geo (3-provider IP cascade), air-quality (Open-Meteo global AQI). Fixed `/sentinel` STAC query bug, `/geo` ASN formatting, `/air-quality` source migration (OpenAQ v2 → Open-Meteo).

### v2.4 — RECON Toolkit
Added 5 endpoints: `/ssl/:host` (cert chain inspector), `/news/live` (15 broadcasters), `/ofac/check` + `/ofac/refresh` (OFAC auto-flag system), `/scan` (TCP port scanner with SSRF guards). Patched `/whois`, `/geo`, `/crypto/*` to inject OFAC flags automatically. Test harness now covers all 39 registered routes, all passing.

---

## 🙏 Credits

ClawdWatch Lobster Edition is built on the shoulders of:

- **[cloudweaver/clawdwatch](https://github.com/cloudweaver/clawdwatch)** — original "all-seeing OSINT agent" architecture, region model, RSS/news aggregation
- **[simplifaisoul/osiris](https://github.com/simplifaisoul/osiris)** — Open Source Intelligence Platform (MIT), inspiration for the 15 OSIRIS-derived endpoints
- **[OpenSky Network](https://opensky-network.org/)** — global flight tracking
- **NOAA, USGS, GDACS, NWS, NASA, Open-Meteo, OpenAQ** — public data feeds
- **NVD, CISA, OpenSanctions** — vulnerability + sanctions intel
- **Celestrak, Element84, ipapi.co, freeipapi.com, ipwho.is** — satellite, geolocation, IP intel

---

## 📜 License

MIT

---

## ⚠️ Disclaimer

ClawdWatch aggregates **publicly available** information from public APIs and RSS feeds only. This tool is for **informational purposes** — always verify critical information through official channels.

The built-in TCP port scanner is opt-in and defaults to OFF. Use it only on hosts you own or have explicit permission to test. Scanning third-party hosts may violate their Terms of Service or local law.

<div align="center">

*In the fog of war, be the one who sees clearly.*

🦀
</div>
