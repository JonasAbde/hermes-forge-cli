# Blast Radius — Hermes Forge CLI

## Overview

The Her mess Forge CLI is a **standalone npm package** with no server, no database, and no persistent services. The blast radius of changes is limited to:

### Primary Blast Radius
1. **npm package** (`@jonasabde/hermes-forge-cli`) — The published package on npmjs.org
2. **User config files** — `~/.config/@hermes-forge/cli/config.json` (API keys, remote URLs, preferences)
3. **Local checkout** — The git repository working directory

### No Blast Radius For
- **No server infrastructure** — No databases, no API servers, no systemd services
- **No web UI** — No browser sessions, no cookies, no frontend state
- **No mobile app** — No mobile data or device access
- **No other services** — The CLI is self-contained

### Risk Tiers

| Tier | Impact | Examples |
|------|--------|----------|
| 🔴 Critical | npm package breakage, user config corruption | Wrong publish, config file deletion |
| 🟡 High | Command failure, broken TUI | TypeScript errors, dependency breakage |
| 🟢 Medium | Documentation wrong, help text stale | README out of date, --help mismatched |
| 🔵 Low | Cosmetic issues, style | Linting warnings, formatting |

### Mitigations
- **npm publish:** Controlled by `prepublishOnly` script, CI checks, and human approval
- **Config:** Read-only access pattern — CLI reads config, never overwrites without explicit command
- **Git:** Branch protection on main, PR reviews required
- **Tests:** Vitest suite runs on every PR

### Incident Response

| Scenario | Action |
|----------|--------|
| Bad npm publish | `npm unpublish` (within 72h), fix, re-publish patch |
| Config corruption | Backup at `~/.config/@hermes-forge/cli/config.json.bak` |
| Broken CLI commands | Revert PR, publish patch version |
| Broken TUI | Same as broken commands — TUI is in the same package |
