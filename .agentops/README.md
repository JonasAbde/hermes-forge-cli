# .agentops/ — Hermes Forge CLI AgentOps

This directory contains the AgentOps foundation for AI-assisted development of the Hermes Forge CLI.

## Directory Structure

```
.agentops/
├── README.md              # This file — directory overview
├── skills/                # Agent skills (SKILL.md format, auto-discovered by OpenClaw)
│   ├── forge-cli-release/SKILL.md
│   ├── github-issue-to-pr/SKILL.md
│   ├── long-session-protocol/SKILL.md
│   ├── release-checklist/SKILL.md
│   ├── mcp-security-audit/SKILL.md
│   └── api-contract-review/SKILL.md
├── subagents/             # Subagent task configurations
│   ├── planner.json
│   ├── code-reviewer.json
│   ├── test-engineer.json
│   ├── security-reviewer.json
│   ├── frontend-qa.json       # N/A for CLI — kept for uniformity
│   ├── mobile-qa.json         # N/A for CLI — kept for uniformity
│   ├── docs-writer.json
│   └── release-manager.json
├── mcp/                   # MCP server configurations
│   ├── github.readonly.json
│   ├── github.write-approved.json
│   ├── playwright.json
│   ├── context7.json
│   └── firecrawl.json
└── security/              # Security policies and guardrails
    ├── GUARDRAILS.md
    ├── SECRETS_POLICY.md
    └── BLAST_RADIUS.md
```

## CLI-Specific Skills

| Skill | Purpose |
|-------|---------|
| `forge-cli-release` | Release management for npm package |
| `github-issue-to-pr` | Convert GitHub issues to pull requests |
| `long-session-protocol` | Protocol for extended development sessions |
| `release-checklist` | Release checklist process |
| `mcp-security-audit` | Security audit with MCP tools |
| `api-contract-review` | API contract verification |

All skills use the OpenClaw `SKILL.md` format in subdirectories (`skills/<name>/SKILL.md`) and are auto-discovered via `skills.load.extraDirs`.

## Subagents

8 subagent configurations covering planning, code review, testing, security, QA (N/A marked), docs, and release management.

## MCP Servers

| Server | Access Level | Purpose |
|--------|-------------|---------|
| GitHub Read | Read-only | Code review, issue reading |
| GitHub Write | Approved-write | PR creation, issue management |
| Playwright | Full | E2E test automation |
| Context7 | Full | Context retrieval |
| Firecrawl | Full | Web crawling for docs |

## Security

- `GUARDRAILS.md` — Behavioral guardrails for AI-assisted development
- `SECRETS_POLICY.md` — Secrets handling and prevention
- `BLAST_RADIUS.md` — CLI-specific blast radius assessment (npm publish scope, no DB, no server)
