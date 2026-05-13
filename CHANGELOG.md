# Changelog

## 2.0.0 (2026-05-13)

First stable release published to npmjs.org.

### 🎨 Brand
- ASCII logo (large/small/compact)
- Color system — primary/secondary/success/warning/error/accent
- Theme manager with gradient text, panel, bullet, progress bar helpers
- Metric row, KV display, spinner support

### 🔌 Plugin System
- Manifest-based: `manifest.yaml` defines commands, hooks, resources
- `forge plugin create/discover/install/uninstall`
- Dynamic command injection from plugins

### 🤖 AI-native
- `forge ask <query>` — LLM-powered questions about the platform
- `forge suggest` — Command recommendations based on context
- `forge agent spawn <task>` — Spawn AI agent for autonomous execution

### 🖥️ Ink TUI (React 19)
- Dashboard view — live system overview
- Health Monitor — service status table
- Pack Browser — pack metadata viewer
- Live Logs — real-time log streaming
- Replaces deprecated neo-blessed

### ⚡ Performance
- Fast-path: `--help` in ~300ms (was 1.2s)
- Lazy imports on all 27 commands
- TypeScript strict mode throughout

### ✅ Testing
- 29 unit tests: brand package + extension manager
- Vitest-based test suite

### 📦 Publishing
- Published on npmjs.org as `@jonasabde/hermes-forge-cli`
- Install: `npm install -g @jonasabde/hermes-forge-cli`
- Also available via GitHub Packages

### Full Command Set (27)
```
forge --help, --version
forge status, doctor, dev, monitor, logs, health
forge ask, suggest, agent
forge pack {list,validate,build,metadata,sync}
forge deploy {list,create,start,stop,delete}
forge remote {status,login,me,packs}
forge plugin {create,discover,install,uninstall}
forge tui
forge config, env, init, backup, alias, completion
forge upgrade, workspace, schedule
forge docs, open, notify, version
```

## 1.0.0 (2026-05-12)

Initial release on GitHub Packages as `@hermes-agent-dk/hermes-forge-cli`.
