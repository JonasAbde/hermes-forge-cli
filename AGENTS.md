<<<<<<< HEAD
# AGENTS.md

## AI Agent Instructions — Hermes Forge CLI

### Project Overview

**Hermes Forge CLI** (`@jonasabde/hermes-forge-cli` v2.2.0) is the official CLI for the Hermes Forge Platform. It provides commands for development, pack management, MCP tools, AI agents, and deployment — all wrapped in a fast, developer-friendly CLI with an optional Ink/React TUI.

| Component | Stack | Path |
|-----------|-------|------|
| **Source** | TypeScript 5.7+ with ESM | `src/` |
| **Tests** | Vitest | `tests/` |
| **Entry Points** | Node.js bin scripts | `bin/` |
| **Documentation** | Markdown | `docs/` |
| **CI/Workflows** | GitHub Actions | `.github/` |
| **Hermes Config** | Hermes agent config | `.hermes/` |
| **Scripts** | Shell/Node helpers | `scripts/` |
| **Build Output** | Compiled JS | `dist/` |

### Key Architectural Notes

1. **Commander-based CLI:** All commands are registered via `commander` (v12.x) in `src/commands/`. Each command file exports a command factory or builder function.

2. **27 commands** across categories:
   - Core: `status`, `doctor`, `dev`, `monitor`, `logs`, `health`
   - AI-native: `ask`, `suggest`, `agent spawn`
   - Pack Management: `pack list/validate/build/metadata/sync`
   - Deploy: `deploy list/create/start/stop/delete`
   - Plugin System: `plugin create/discover/install/uninstall`
   - Remote & Auth: `remote status/login/me/packs`
   - Utilities: `config`, `env`, `init`, `backup`, `alias`, `completion`, `upgrade`, `workspace`, `schedule`, `docs`, `open`, `notify`, `version`

3. **Ink TUI:** Interactive mode uses Ink (React 19) for live terminal UI with Dashboard, Health Monitor, Pack Browser, and Live Logs views.

4. **Config persistence:** Uses the `conf` npm package to store API keys, remote URLs, and preferences in `~/.config/@hermes-forge/cli/config.json` (or platform equivalent).

5. **Plugin system:** Manifest-based (`manifest.yaml`) for third-party command additions, hooks, and resource overrides.

6. **Health check system:** Dual-mode — script mode (production VPS with systemd/service checks) and fallback mode (local dev HTTP pings).

### How to Run

```bash
# Install globally
npm install -g @jonasabde/hermes-forge-cli

# Or run without installing
npx @jonasabde/hermes-forge-cli forge --help

# Quick start
forge remote login --api-key <key>
forge remote status
```

### Build

```bash
npm run build          # tsc — compiles src/ → dist/
npm run dev            # tsc --watch
```

### Tests

```bash
npm test               # vitest run
```

### Lint & Format

```bash
npm run lint           # ESLint on src/
```

### Release

```bash
npm run build                      # Must pass first
npm version <major|minor|patch>    # Bump version
npm publish                       # Publishes to npmjs.org as @jonasabde/hermes-forge-cli
git push --tags                   # Tag release
```

See `docs/RELEASE_CHECKLIST.md` for the full process.

### Gotchas

- **ESM only:** `"type": "module"` in package.json. All imports use ESM syntax.
- **Config file:** API keys stored in `~/.config/@hermes-forge/cli/config.json` in plaintext — never commit.
- **`prepublishOnly`:** Set to `npm run build` — ensure build succeeds before publish.
- **Ink/React:** TUI mode depends on Ink v7 + React 19. JSX must be compiled by TypeScript (tsx is valid in `.tsx` files).
- **Health script:** The production health script at `~/.hermes/scripts/forge-health.sh` is optional — fallback mode works without it.
- **No server/DB:** This package is CLI-only. It connects to remote Hermes Forge instances via API. No local database, no server processes.
=======
# AGENTS.md — Hermes Forge CLI

> AI agent instructions for this repository.
> AgentOps lives in **hermes-forge-ecosystem** — start there.

## Identity

You are an AI agent working on the **Hermes Forge CLI** — a public developer tool
for pack management, deployment, and MCP integration.

**Production:** npm package `@jonasabde/hermes-forge-cli`

## Working Principles

1. **Read-only by default.** Don't modify without approval.
2. **No publish without CI passing.** Hard guardrail.
3. **No breaking changes without deprecation notice.** CLI is a public tool.
4. **No secrets in output.** Ever.
5. **Verify everything.** Run tests before any commit.

## Getting Started

1. Read `hermes-forge-ecosystem/.agentops/README.md` — all skills, subagents, references
2. Load relevant skill from `.agentops/skills/<name>/SKILL.md`
3. Delegate to subagent for specialized work

## Related

- `hermes-forge-ecosystem` — https://github.com/JonasAbde/hermes-forge-ecosystem
- `.agentops/README.md` — pointer to ecosystem
>>>>>>> 7dc53f2 (chore(agentops): add AgentOps pointer to ecosystem control plane)
