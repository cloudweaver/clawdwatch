---
name: clawdwatch
description: Pull live Clawdwatch OSINT snapshots in JSON for one or more regions so an OpenClaw agent can inspect flights, outages, news, social feeds, and optional satellite or ship data.
---

# Clawdwatch

Use this skill when you need an on-demand OSINT pull from the local Clawdwatch workspace.

## When To Use It

- You need current flight, outage, news, or social data for one or more regions.
- You need a machine-readable JSON snapshot that can be parsed or summarized.
- You need to expand coverage beyond the default Middle East preset.

## Commands

Run commands from the repository root:

```bash
npm run snapshot -- --json --regions middle_east,eastern_europe
```

List available region presets:

```bash
npm run regions -- --json
```

Pull every preset region in one pass:

```bash
npm run snapshot -- --json --all-regions
```

Include optional ship and satellite sources:

```bash
npm run snapshot -- --json --regions middle_east --ships strait_hormuz,persian_gulf --satellite --days 2
```

## Expected Output

- `regions`: per-region flight counts, alert summaries, and mapped internet connectivity.
- `news`: latest aggregated headlines.
- `social`: latest Twitter/Reddit OSINT posts.
- `ships`: optional strategic waterway summaries when requested.
- `satellite`: optional Sentinel Hub imagery summary when requested and credentials exist.

## Operating Notes

- Default region is `middle_east` if none is provided.
- `--all-regions` expands to all named presets except `global`.
- Use `global` explicitly when you want the widest OpenSky query.
- `--json` is the preferred mode for agent use.
