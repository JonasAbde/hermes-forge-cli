# Forge CLI

[![CI](https://github.com/JonasAbde/hermes-forge-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/JonasAbde/hermes-forge-cli/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/JonasAbde/hermes-forge-cli)](https://github.com/JonasAbde/hermes-forge-cli/releases)

CLI tooling for the [Hermes Forge Platform](https://forge.tekup.dk) — development, pack management, MCP tools, and deployment.

Package: `hermes-forge-cli` · Binary: `forge`

## Installation

```bash
# Direct from GitHub Release (no npm registry needed):
npm install -g https://github.com/JonasAbde/hermes-forge-cli/releases/download/v1.0.0/hermes-forge-cli-1.0.0.tgz

# Or clone + link:
git clone https://github.com/JonasAbde/hermes-forge-cli.git
cd hermes-forge-cli && npm install && npm run build && npm link

# Via npm (when published):
# npm install -g hermes-forge-cli
```

## Quick Start

```bash
# Check connectivity
forge remote status

# Authenticate
forge remote login --api-key <your-api-key>

# View your profile
forge remote me

# List available packs
forge remote packs
```

## Commands

### Remote & Auth
- `forge remote status` — Show remote forge status and health
- `forge remote login` — Authenticate with the remote forge
- `forge remote me` — Show your authenticated profile
- `forge remote packs` — List packs available on the remote forge

### Deploy
- `forge deploy list` — List all deployments
- `forge deploy create <name> <pack-ids...>` — Create a new deployment
- `forge deploy start <id>` — Start a deployment
- `forge deploy stop <id>` — Stop a deployment
- `forge deploy delete <id>` — Delete a deployment

### Pack Management
- `forge pack list` — List local packs
- `forge pack validate` — Validate pack schema
- `forge pack build` — Build pack metadata and cutouts
- `forge pack metadata` — Generate compact metadata for MCP
- `forge pack sync` — Sync local packs with remote forge (`--dry-run` supported)

### Core
- `forge status` — Overview of all services
- `forge doctor` — Run system diagnostics
- `forge dev` — Start development services
- `forge docs` — Start Forge Docs (VitePress)
- `forge open <target>` — Open a Forge URL in browser
- `forge config` — Manage CLI configuration
- `forge env` — Manage environment configurations
- `forge logs` — View service logs
- `forge monitor` — Real-time monitoring dashboard
- `forge init` — Initialize a new project
- `forge mcp` — Manage MCP Registry server
- `forge plugin` — Manage plugins
- `forge completion` — Generate shell completion scripts
- `forge alias` — Manage command aliases
- `forge backup` — Backup and restore data
- `forge version` — Output the current version

## Shell Completion

```bash
# Bash
forge completion bash --install

# Zsh
forge completion zsh --install

# Fish
forge completion fish --install
```

## Documentation

- **[Auth Flow](docs/CLI_AUTH_FLOW.md)** — Authentication, API keys, troubleshooting
- **[Pack Sync Contract](docs/CLI_PACK_SYNC_CONTRACT.md)** — Backend API spec for pack sync
- **[Release Checklist](docs/FORGE_CLI_RELEASE_CHECKLIST.md)** — v1 release procedure

## Development

```bash
# Clone the repo
git clone https://github.com/JonasAbde/hermes-forge-cli.git
cd hermes-forge-cli

# Install dependencies
npm install

# Build
npm run build

# Test
npm test

# Lint
npm run lint

# Development watch mode
npm run dev
```

## Requirements

- Node.js 18+
- npm 9+

## Related

- [Hermes Forge Platform](https://github.com/JonasAbde/hermes-forge-platform) — The Forge platform server
- [Forge.tekup.dk](https://forge.tekup.dk) — Hosted Forge instance
