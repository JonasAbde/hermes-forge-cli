# @hermes-forge/cli

Official CLI for Hermes Forge Platform.

## Installation

From the monorepo root:

```bash
npm install --workspace=cli
```

Or install globally once published:

```bash
npm install -g @hermes-forge/cli
```

## Usage

```bash
forge status
forge doctor
forge dev --with-docs
forge docs
forge open hub
forge pack list
forge mcp start
```

## Core Commands

- `forge status [--watch] [--json]` — Overview of all services
- `forge doctor [--strict] [--quick] [--deep] [--json]` — Diagnostics (`--deep` runs `smoke-test` + `smoke-auth`, optional `smoke-http` when API is up; use `FORGE_REPO_ROOT` if not run from repo root)
- `forge dev [--with-docs] [--only-web] [--only-api] [--only-docs] [--forge-api-proxy]` — Start development services (`--only-web` forces embedded catalog unless `--forge-api-proxy`)
- `forge docs [--open]` — Start Forge Docs (VitePress)
- `forge open <target>` — Open docs, hub, showcase, or API in browser
- `forge pack ...` — Pack management (list, validate, build)
- `forge mcp ...` — MCP registry commands

Run `forge --help` or `forge <command> --help` for details.

## WSL2 Notes

The CLI automatically detects WSL2 and provides appropriate browser and URL recommendations. Use `127.0.0.1` or the detected host IP when accessing from Windows.

## Configuration

Configuration is stored in `~/.forge/config.json`. Use:

```bash
forge config set ports.docs 5191
forge config get
```

## Development

```bash
cd cli
npm run dev     # Watch build
npm test        # Run tests
npm run lint
```

This CLI replaces the previous ad-hoc `npm run dev*` scripts and provides consistent, well-documented development workflows across the entire Forge Platform.
