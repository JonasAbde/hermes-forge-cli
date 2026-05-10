# Forge CLI

CLI tooling for the Forge Platform — development, pack management, and deployment.

Package: `@hermes-forge/cli`

## Installation

```bash
# Install from repo
npm install --workspace=cli

# Or globally once published
npm install -g @hermes-forge/cli

# Run without global install (from repo root)
npm run forge -- status
```

## Authentication

```bash
# Login to remote forge
forge remote login --api-key <your-api-key>

# Check auth status
forge remote status

# View your profile
forge remote me
```

## Remote Commands

Manage your connection to `forge.tekup.dk`:

- `forge remote status` — Show remote forge status and health
- `forge remote login` — Authenticate with the remote forge
- `forge remote me` — Show your authenticated profile
- `forge remote packs` — List packs available on the remote forge

## Deploy Commands

Deploy agent packs to the remote forge instance:

- `forge deploy list` — List all deployments
- `forge deploy create <name> <pack-ids...>` — Create a new deployment
- `forge deploy start <id>` — Start a deployment
- `forge deploy stop <id>` — Stop a deployment
- `forge deploy delete <id>` — Delete a deployment

Status colors: **green** = running, **gray** = stopped, **red** = error.

## Pack Commands

Manage and build Agent Packs locally:

- `forge pack list` — List local packs (supports `--catalog`, `--theme`, `--json`)
- `forge pack validate` — Validate pack schema (supports `--strict`)
- `forge pack build` — Build pack metadata and cutouts (supports `--watch`, `--out`)
- `forge pack metadata` — Generate compact metadata for MCP (supports `--catalog`, `--out`, `--format`)
- `forge pack sync` — Sync local packs with remote forge (supports `--dry-run`, `--target`, `--api-key`)

> **Note:** `forge pack sync` sends packs to the remote forge API endpoint. If the backend endpoint returns a 404, the remote server may not have the sync endpoint deployed yet. Check [forge.tekup.dk/status](https://forge.tekup.dk/status) for updates. The `--dry-run` flag shows what would be sent without making any changes.

## Core Commands

- `forge status [--watch] [--json]` — Overview of all services
- `forge doctor [--strict] [--quick] [--deep] [--json]` — Run system diagnostics
- `forge dev [--with-docs] [--only-api] [--only-web] [--only-docs]` — Start development services
- `forge docs [--open] [--no-open]` — Start Forge Docs (VitePress)
- `forge open <target>` — Open a Forge URL in browser (targets: docs, hub, showcase, catalog, chat, api)
- `forge config [get|set|reset]` — Manage CLI configuration
- `forge env [use|list|validate|diff|show]` — Manage environment configurations
- `forge logs [--follow] [--lines] [--level]` — View service logs
- `forge monitor` — Real-time monitoring dashboard
- `forge init [pack|web-extension|mcp-tool]` — Initialize a new project
- `forge mcp [start|stop|status|test|tools]` — Manage MCP Registry server
- `forge plugin [list|search|install|uninstall|update]` — Manage plugins
- `forge completion <bash|zsh|fish>` — Generate shell completion scripts
- `forge alias [list|set|remove|show|run|init]` — Manage command aliases
- `forge backup [create|restore|list|delete|auto]` — Backup and restore data
- `forge upgrade [--check] [--force]` — Upgrade Forge CLI
- `forge schedule [add|list|remove|run|logs|search]` — Manage scheduled tasks
- `forge notify [send|config|setup|test]` — Manage notifications
- `forge workspace [list|create|switch|info|detect|init]` — Manage workspaces
- `forge interactive` — Interactive guided mode
- `forge version` — Output the current version
- `forge help [command]` — Display help

## Shell Completion

Generate tab-completion for your shell:

```bash
# Bash
source <(forge completion bash)
forge completion bash --install

# Zsh
source <(forge completion zsh)
forge completion zsh --install

# Fish
forge completion fish | source
forge completion fish --install
```

## Documentation

- **[CLI Auth Flow](docs/CLI_AUTH_FLOW.md)** — How authentication works, setting API keys, troubleshooting
- **[Pack Sync Contract](docs/CLI_PACK_SYNC_CONTRACT.md)** — Backend API contract for `forge pack sync`
- **[Release Checklist](docs/FORGE_CLI_RELEASE_CHECKLIST.md)** — v1 release procedure and npm publish steps

## Troubleshooting

**Connection issues:**
- Verify your internet connection
- Run `forge remote status` to check if the remote forge is reachable
- Ensure your API key is set: `forge remote login --api-key <key>`

**Build errors:**
- Run `npx tsc --noEmit` in `cli/` to check for TypeScript errors
- Ensure all dependencies are installed: `npm install` from repo root

**Auth errors:**
- Re-authenticate: `forge remote login --api-key <key>`
- Check your config: `forge config get`

**WSL2:**
- The CLI auto-detects WSL2 and adjusts browser and URL handling
- Use `127.0.0.1` or the detected host IP when accessing from Windows

## Configuration

Stored in `~/.forge/config.json`:

```bash
forge config set ports.docs 5191
forge config get
```

## Development

```bash
# Run tests from repo root
npm run test:cli

# Inside cli/
cd cli
npm run dev     # Watch build
npm test        # Run tests
npm run lint
npx tsc         # Type-check
```
