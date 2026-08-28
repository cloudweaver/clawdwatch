---
name: clawdwatch-threat-brief
description: "Audit ClawdWatch and synthesize a live DEFCON threat brief."
version: 0.3.0
author: Hermes
platforms: [windows, macos, linux]
metadata:
  hermes.tags:
    - Intelligence
    - DEFCON
    - OSINT
    - Threat-Assessment
    - ClawdWatch
---

# ClawdWatch Threat Brief

Produces a structured threat briefing by auditing the ClawdWatch Lobster Edition
source tree and cross-referencing live DEFCON / intel sources. Stdlib + axios only.

## When to Use

- User says "check DEFCON", "run threat brief", or "what's the global threat level"
- User pastes a Twitter/X link and asks to investigate
- DEFCON level change is suspected or needs verification
- After a major geopolitical event (ceasefire collapse, missile strike, etc.)
- Morning/evening security posture check

## Prerequisites

### ClawdWatch repo on disk
```
git clone https://github.com/Franzferdinan51/clawdwatch-lobster-edition.git
cd clawdwatch-lobster-edition
```

### Node dependencies
```
npm install
```

### No API keys required for core intel sources
All core sources in `intel.ts` are free/public:
- DEFCON: defconlevel.com (no key)
- Earthquakes: USGS GeoJSON (no key)
- Weather: NWS API + Open-Meteo (no key)
- GDACS disasters: gdacs.org (no key)

Optional keys for extended sources (osiris.ts): `OPENSANCTIONS_API_KEY`,
`TWITTER_BEARER_TOKEN`, `SENTINEL_HUB_*`.

### Required env vars for `src/alerts/defcon.ts`
```
TELEGRAM_BOT_TOKEN=...       # Telegram bot token
TELEGRAM_CHAT_ID=...         # Destination chat ID
SLACK_DEFCON_WEBHOOK_URL=... # Optional Slack incoming webhook
DEFCON_TELEGRAM_MIN_LEVEL=4  # Telegram fires at DEFCON 4+ (default: 4)
DEFCON_SLACK_MIN_LEVEL=3     # Slack fires at DEFCON 3+ (default: 3)
DEFCON_COOLDOWN_MS=1800000   # 30 min between repeat alerts (default)
DEFCON_POLL_INTERVAL_MS=300000 # Poll every 5 min (default)
```

## How to Run

### One-shot threat brief (no server)
```bash
npm run snapshot   # runs: ts-node src/cli.ts snapshot
```

### HTTP API (live DEFCON + intel endpoints)
```bash
npm run http       # runs: ts-node src/http.ts  (port 3444)
```

### Direct DEFCON check via curl
```bash
curl http://localhost:3444/defcon
curl http://localhost:3444/defcon/score   # lightweight: level + score only
```

### Shell script (no server needed)
```bash
bash skills/clawdwatch-threat-brief/scripts/clawdwatch-brief.sh
```

## Quick Reference

| Command | What it does |
|---------|-------------|
| `npm run snapshot` | One-call brief: flights, quakes, DEFCON, top news |
| `npm run http` | HTTP server on port 3444 |
| `GET /defcon` | Enriched DEFCON response with threat score + thresholds |
| `GET /defcon/score` | Lightweight: `{level, score, levelLabel, timestamp}` |
| `GET /osint` | Full global OSINT summary |
| `GET /earthquakes?min=4.0` | USGS M4+ earthquakes last 24h |
| `GET /gdacs` | GDACS global disaster alerts |
| `GET /weather/us` | NWS active US weather alerts |
| `bash skills/.../clawdwatch-brief.sh` | One-shot brief runner (no server needed) |

## References

| File | Purpose |
|------|---------|
| `references/defcon-alert-flow.txt` | Alert handler state machine, channel rules, cooldown/escalation logic |
| `references/threat-score-ref.txt` | DefconStatus interface, fetchDefconLevel(), defconScore(), HTTP endpoints |

## Procedure

### Step 1 — Audit the DEFCON alert system

Read the alert handler and intel source:
- `src/alerts/defcon.ts` — alert handler with cooldown, escalation, Telegram/Slack
- `src/sources/intel.ts` — `fetchDefconLevel()`, `defconScore()`, DEFCON descriptions
- `src/http.ts` — `/defcon` and `/defcon/score` routes

### Step 2 — Check the live DEFCON level

```bash
curl http://localhost:3444/defcon/score
```

If the server isn't running, fetch directly via `web_extract`:
```
web_extract("https://www.defconlevel.com/current-level")
```

Parse the level from the page — look for the OSINT estimate label
(e.g. "DEFCON 3 ROUND HOUSE") in the hero block.

### Step 3 — Cross-reference with live sources

Run parallel fetches for:
- DEFCON alert page + nuclear threat level (defconlevel.com)
- Any recent earthquake activity M5.0+ (USGS feed)
- GDACS active disasters
- Twitter/X thread if user provided a link

### Step 4 — Synthesize the threat brief

Produce the following EXACT format every time. Do not substitute, truncate, or summarize differently. Live data is mandatory — never skip a live fetch.

```
🦀 ClawdWatch Threat Brief — [YYYY-MM-DD]

DEFCON level / Nuclear / Global  →  ASCII bar charts + score + label (one line each)

[BLANK LINE]

| Level | Label | Score | Status |
|-------|-------|-------|--------|
| DEFCON 1 | 🔴 CRITICAL | 100 | — |
| DEFCON 2 | 🟠 HIGH | 75 | — |
| DEFCON 3 | 🟡 ELEVATED | 50 | — |   ← current, marked with ⬅️ CURRENT
| DEFCON 4 | 🔵 GUARDED | 25 | — |
| DEFCON 5 | 🟢 LOW | 0 | — |

[BLANK LINE]

### 🚨 BREAKING — [date or "Today"]

[One-line headline event]

[Table: target | location rows if applicable]

[CENTCOM or relevant authority response if available]

[Context: what triggered it]

### [CEASEFIRE / STATUS section if applicable]

| Date | Event |
|------|-------|
| YYYY-MM-DD | Description |

[One-line status verdict]

### Active Risk Drivers

| Driver | Level | Notes |
|--------|-------|-------|
| ... | ... | ... |

[At minimum: ceasefire, Hormuz, Russia-Ukraine, Iran nuke, North Korea, Pacific seismic]

[BLANK LINE]

**Bottom line:** [One-sentence assessment] — [recommended watch window]
```

The brief is produced AFTER the script audit, not instead of it. If the HTTP server is not running, fall back to `web_extract` on defconlevel.com directly.

### Step 5 — Build missing files if needed

If `src/alerts/defcon.ts` is missing:
1. Create it using the `DefconAlertHandler` class pattern
2. Patch `intel.ts` to add `DEFCON_SCORE_*` constants, `defconScore()`,
   and full DEFCON 4 & 5 descriptions
3. Patch `DefconStatus` to include `threatScore: number`
4. Patch `fetchDefconLevel()` to return `threatScore`
5. Patch `http.ts` to add `/defcon/score` endpoint

## Pitfalls

- **defconlevel.com is OSINT estimate only** — the official DEFCON level is
  classified. Always note this.
- **DEFCON 4 & 5 descriptions** are often missing from `intel.ts` —
  patch them in before running a brief.
- **Threat score scale** — DEFCON 1 = 100 (max threat), DEFCON 5 = 0.
  Never reverse this.
- **Cooldown logic** — `DefconAlertHandler` suppresses repeat alerts at the
  same level until cooldown expires. First-run initialization always fires
  a `stable` alert.
- **No server running** — the `npm run http` server must be up for
  `curl /defcon`. If not running, fall back to `web_extract` on
  defconlevel.com directly.
- **USGS earthquake TTL** — `intel.ts` caches USGS data for 5 min.
  Earthquake briefs should note the fetch time.

## Verification

```bash
# 1. Server is running
curl http://localhost:3444/status

# 2. DEFCON score endpoint returns JSON with level + score
curl http://localhost:3444/defcon/score
# Expected: {"level":3,"score":50,"levelLabel":"ELEVATED",...}

# 3. Full DEFCON endpoint includes threat thresholds
curl http://localhost:3444/defcon
# Expected: includes all 5 threshold entries

# 4. Compile check (no TypeScript errors)
cd clawdwatch-lobster-edition && npx tsc --noEmit
# Expected: no output = clean compile
```
