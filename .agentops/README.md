# .agentops/ — Hermes Forge CLI AgentOps

This directory contains the AgentOps foundation for AI-assisted development of the Hermes Forge CLI.

## Directory Structure

```
.agentops/
├── README.md              # This file — directory overview
├── skills/                # Agent skills relevant to CLI development
│   ├── forge-cli-release.md
│   ├── github-issue-to-pr.md
│   ├── long-session-protocol.md
│   ├── release-checklist.md
│   ├── mcp-security-audit.md
│   └── api-contract-review.md
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
| `forge-cli-release.md` | Release management for npm package |
| `github-issue-to-pr.md` | Convert GitHub issues to pull requests |
| `long-session-protocol.md` | Protocol for extended development sessions |
| `release-checklist.md` | Release checklist process |
| `mcp-security-audit.md` | Security audit with MCP tools |
| `api-contract-review.md` | API contract verification |

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
