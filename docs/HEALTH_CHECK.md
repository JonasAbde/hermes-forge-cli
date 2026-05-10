# forge health — Health Check Command

## Overview

`forge health` runs comprehensive health diagnostics against Forge services.
It auto-detects the operating environment and runs appropriate checks.

## Usage

```bash
forge health               # Default: human-readable report
forge health --json        # Machine-readable JSON for scripts/CI
forge health --watch       # Live-updating dashboard (auto-refresh every 5s)
forge health -i 2000 -w    # Watch mode with 2-second refresh interval
forge health --script /path/to/forge-health.sh  # Custom health script path
```

## Modes

### Script mode (production VPS)
When `~/.hermes/scripts/forge-health.sh` exists (default on the Forge VPS),
the CLI executes it with `--json` and parses the output. Covers:

- **6 systemd services**: forge-api, hermes-forge-mcp, nginx (critical),
  forge-web, forge-forward-journal (warning)
- **Timers**: forge-forward-journal.timer
- **GitHub Actions runners**: auto-detects `actions.runner.*.service` units
- **3 HTTP endpoints**: forge.tekup.dk, localhost:8641/health, localhost:5181/health
- **Nginx config**: `sudo nginx -t` syntax check
- **System resources**: disk usage (warn @80%, crit @90%), memory usage (warn @85%, crit @95%)

### Fallback mode (local dev / CI)
When the health script is unavailable, the CLI performs simple HTTP endpoint
pings against common Forge services. No systemd, nginx, or resource checks.

## Exit codes

| Code | Status | Meaning |
|------|--------|---------|
| 0    | OK     | All checks passed |
| 1    | WARNINGS | Non-critical issues (disk >80%, known-defunct services) |
| 2    | CRITICAL | Service down, endpoint failing, nginx broken |

## JSON output format

```json
{
  "status": "OK",
  "exitCode": 0,
  "timestamp": "2026-05-10T11:15:37Z",
  "hostname": "vps-70333b3c",
  "mode": "script",
  "checks": [
    { "check": "service:forge-api.service", "status": "ok", "message": "Service forge-api.service er active", "timestamp": "..." }
  ],
  "summary": { "ok": 11, "warn": 3, "critical": 0, "total": 14 }
}
```

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      forge health (CLI)                      │
│  src/commands/health.ts   ←   src/lib/healthCheckSystem.ts   │
└─────────────────────┬────────────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
  ┌──────────────┐       ┌──────────────┐
  │ Script mode  │       │ Fallback mode │
  │ (bash exec)  │       │ (HTTP fetch)  │
  └──────┬───────┘       └──────┬───────┘
         ▼                      ▼
  ~/.hermes/scripts/      forge.tekup.dk:443
  forge-health.sh         localhost:8641/health
                          localhost:5181/health
```

The CLI always returns a normalised `HealthReport` regardless of mode,
so downstream consumers (CI, monitoring, alerts) get a consistent shape.

## Implementation files

| File | Purpose |
|------|---------|
| `src/lib/healthCheckSystem.ts` | Core engine: exec script or fallback HTTP checks |
| `src/commands/health.ts` | CLI command: terminal output, JSON, watch mode |
| `~/.hermes/scripts/forge-health.sh` | Bash health check script (production VPS) |
| `~/.hermes/scripts/forge-alert.sh` | Cron-friendly alert wrapper (logs to `~/.hermes/cron/output/`) |
