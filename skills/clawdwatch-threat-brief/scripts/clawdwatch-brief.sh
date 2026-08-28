#!/usr/bin/env bash
#============================================================
# clawdwatch-brief.sh
# One-shot ClawdWatch threat brief runner
# Fetches live DEFCON data and produces the full structured brief
# Usage: bash skills/clawdwatch-threat-brief/scripts/clawdwatch-brief.sh
#============================================================
set -euo pipefail

REPO_DIR="${CLAWDWATCH_REPO:-.}"

# ── Defaults (used when HTTP server is offline) ──────────────
LEVEL=3
SCORE=50
LABEL="ELEVATED"
TODAY="$(date -u '+%Y-%m-%d')"

# ── Step 1: Repo audit ──────────────────────────────────────
echo "============================================================"
echo "  ClawdWatch Threat Brief — $TODAY"
echo "============================================================"
echo ""

echo "[1] Repo audit"
if [[ ! -d "$REPO_DIR/src/alerts" ]]; then
  echo "  ERROR: src/alerts/ not found — set CLAWDWATCH_REPO or run from repo root"
  exit 1
fi
echo "  ✅ src/alerts/    -> $(ls "$REPO_DIR/src/alerts/" 2>/dev/null | tr '\n' ' ')"
echo "  ✅ src/sources/   -> $(ls "$REPO_DIR/src/sources/" 2>/dev/null | tr '\n' ' ')"
echo ""

# ── Step 2: TypeScript compile check ────────────────────────
echo "[2] TypeScript compile check"
cd "$REPO_DIR"
if npx tsc --noEmit 2>&1; then
  echo "  ✅ TypeScript: clean compile"
else
  echo "  ❌ TypeScript: errors found — aborting"
  exit 1
fi
echo ""

# ── Step 3: Live DEFCON check ─────────────────────────────
echo "[3] DEFCON live check"

DEFCON_RESP=$(curl -sf http://localhost:3444/defcon/score 2>/dev/null) || true
if [[ -n "$DEFCON_RESP" ]]; then
  echo "  ✅ HTTP server responding on port 3444"
  LEVEL=$(echo "$DEFCON_RESP" | grep -o '"level":[0-9]' | head -1 | grep -o '[0-9]')
  SCORE=$(echo "$DEFCON_RESP" | grep -o '"score":[0-9]*' | head -1 | grep -o '[0-9]*')
  LABEL=$(echo "$DEFCON_RESP" | grep -o '"levelLabel":"[^"]*"' | head -1 | sed 's/"levelLabel":"//;s/"//')
  echo "  DEFCON $LEVEL — $LABEL — Threat Score: $SCORE/100"
else
  echo "  ⚠️  HTTP server not running on port 3444"
  echo "  Fetching defconlevel.com directly..."
  HTML=$(curl -sf --max-time 15 -A "ClawdWatch-Lobster/1.0" \
    "https://www.defconlevel.com/current-level") || true

  if [[ -n "$HTML" ]]; then
    # Try to extract DEFCON level from hero block
    LEVEL_MATCH=$(echo "$HTML" | grep -oP 'DEFCON\s*([1-5])' | head -1 | grep -oP '[1-5]')
    if [[ -n "$LEVEL_MATCH" ]]; then
      LEVEL="$LEVEL_MATCH"
    fi
    # Score map
    case "$LEVEL" in
      1) SCORE=100; LABEL="CRITICAL" ;;
      2) SCORE=75;  LABEL="HIGH" ;;
      3) SCORE=50;  LABEL="ELEVATED" ;;
      4) SCORE=25;  LABEL="GUARDED" ;;
      5) SCORE=0;   LABEL="LOW" ;;
    esac
    echo "  DEFCON $LEVEL — $LABEL — Threat Score: $SCORE/100 (OSINT estimate)"
  else
    echo "  ⚠️  Could not reach defconlevel.com — using defaults"
    echo "  DEFCON $LEVEL — $LABEL — Threat Score: $SCORE/100 (cached/default)"
  fi
fi
echo ""

# ── Step 4: Threat bar ──────────────────────────────────────
echo "[4] Threat Score Bar"
BARS=$((SCORE / 10))
BLANKS=$((10 - BARS))
BAR_FILLED=$(printf '%*s' "$BARS" '' | tr ' ' '█')
BAR_EMPTY=$(printf '%*s' "$BLANKS" '' | tr ' ' '░')
printf "  DEFCON %s  %s%s  %s/100  %s\n" \
  "$LEVEL" "$BAR_FILLED" "$BAR_EMPTY" "$SCORE" "$LABEL"
echo ""

# ── Step 5: Risk drivers (defaults — update from live feeds as needed) ──
echo "[5] Active Risk Drivers (defaults — agent enriches from live feeds)"
echo "     • US-Iran ceasefire:        status unknown"
echo "     • Strait of Hormuz:          status unknown"
echo "     • Russia-Ukraine:           status unknown"
echo "     • Iran nuke program:         status unknown"
echo "     • North Korea:               status unknown"
echo "     • Pacific seismic:           status unknown"
echo ""
echo "  → Agent will enrich from live feeds and produce full structured brief"
echo ""

echo "============================================================"
echo "  Brief complete — $(date -u '+%Y-%m-%d %H:%M UTC')"
echo "============================================================"
