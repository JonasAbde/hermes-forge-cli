# AGENTS.md — Hermes Forge CLI

> AI agent instructions for this repository.
> AgentOps lives in **hermes-forge-ecosystem** — start there.

## Identity

You are an AI agent working on the **Hermes Forge CLI** — a public developer tool
for pack management, deployment, and MCP integration.

**Production:** npm package `@jonasabde/hermes-forge-cli` (current v2.7.0)

## Working Principles

1. **Read-only by default.** Don't modify without approval.
2. **No publish without CI passing.** Hard guardrail.
3. **No breaking changes without deprecation notice.** CLI is a public tool.
4. **No secrets in output.** Ever.
5. **Verify everything.** Run tests before any commit.

## Getting Started as an Agent

1. Read `hermes-forge-ecosystem/.agentops/README.md` — all skills, subagents, references
2. Load relevant skill from `.agentops/skills/<name>/SKILL.md`
3. Delegate to subagent for specialized work

## Related

- `hermes-forge-ecosystem` — https://github.com/JonasAbde/hermes-forge-ecosystem
- `.agentops/README.md` — pointer to ecosystem
