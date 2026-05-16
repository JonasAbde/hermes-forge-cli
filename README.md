<p align="center"><img src=".github/forge-wordmark.svg" alt="Hermes Forge" width="400"/></p>

# Forge CLI

[![npm](https://img.shields.io/npm/v/@jonasabde/hermes-forge-cli)](https://www.npmjs.com/package/@jonasabde/hermes-forge-cli)
[![CI](https://github.com/JonasAbde/hermes-forge-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/JonasAbde/hermes-forge-cli/actions/workflows/ci.yml)

**27 commands** · Ink TUI · Plugins · AI-native · 300ms fast-path

CLI tooling for the [Hermes Forge Platform](https://forge.tekup.dk) — development, pack management, MCP tools, AI agents, and deployment.

## Installation

```bash
# Install globally
npm install -g @jonasabde/hermes-forge-cli

# Or run without installing
npx @jonasabde/hermes-forge-cli forge --help

# Verify
forge --version
# → 2.9.0
```

## Quick Start

```bash
# Check connectivity
forge remote status

# Authenticate (get API key from forge.tekup.dk/settings)
forge remote login --api-key <your-api-key>

# View your profile
forge remote me

# List available packs
forge remote packs
```

## Features

### 🎯 Core
- `forge status` — Overview of all services
- `forge doctor` — Run system diagnostics with port checks, lock files, env checks
- `forge dev` — Start development services
- `forge monitor` — Real-time health monitoring (table view)
- `forge logs` — View service logs
- `forge health` — System health checks

### 🤖 AI-native
- `forge ask <query>` — Ask questions about the Forge platform (LLM-powered)
- `forge suggest` — Get suggestions for next commands and improvements
- `forge agent spawn <task>` — Spawn an autonomous AI agent for a task

### 📦 Pack Management
- `forge pack list` — List local packs
- `forge pack validate` — Validate pack schema
- `forge pack build` — Build pack metadata and cutouts
- `forge pack metadata` — Generate compact metadata for MCP
- `forge pack sync` — Sync local packs with remote forge

### 🚀 Deploy
- `forge deploy list/create/start/stop/delete` — Full deployment lifecycle

### 🔌 Plugin System
- `forge plugin create/discover/install/uninstall` — Manage plugins
- Manifest-based: `manifest.yaml` defines commands, hooks, resources

### 🔐 Remote & Auth
- `forge remote status/login/me/packs` — Remote forge interaction

### 🖥️ Interactive TUI
- `forge tui` — Live terminal UI (Ink/React 19)
- Views: Dashboard, Health Monitor, Pack Browser, Live Logs

### 🔧 Utilities
- `forge config` — Manage CLI configuration
- `forge env` — Manage environment configurations
- `forge init` — Initialize a new project
- `forge backup` — Backup and restore data
- `forge alias` — Manage command aliases
- `forge completion bash/zsh/fish` — Shell completions
- `forge upgrade` — Self-update
- `forge workspace` — Manage workspaces
- `forge schedule` — Manage schedules
- `forge docs` — Start Forge Docs (VitePress)
- `forge open <target>` — Open a URL
- `forge notify` — Send notifications
- `forge version` — Output version info

## Shell Completion

```bash
forge completion bash --install   # Bash
forge completion zsh --install    # Zsh
forge completion fish --install   # Fish
```

## Documentation

- [Release Notes](CHANGELOG.md)
- [Auth Flow](docs/CLI_AUTH_FLOW.md) — Authentication, API keys, troubleshooting
- [Pack Sync Contract](docs/CLI_PACK_SYNC_CONTRACT.md) — Backend API spec for pack sync
- [Health Check](docs/HEALTH_CHECK.md) — Monitoring and health endpoints
- [Release Checklist](docs/FORGE_CLI_RELEASE_CHECKLIST.md) — Release procedure

## Development

```bash
git clone https://github.com/JonasAbde/hermes-forge-cli.git
cd hermes-forge-cli
npm install
npm run build   # Build TypeScript
npm test        # Run tests (29 tests)
npm run dev     # Watch mode
npm run lint    # Lint
```

## Requirements

- Node.js 18+
- npm 9+

## Related

- [Hermes Forge Platform](https://github.com/JonasAbde/hermes-forge-platform) — Platform server
- [Forge.tekup.dk](https://forge.tekup.dk) — Hosted Forge instance
