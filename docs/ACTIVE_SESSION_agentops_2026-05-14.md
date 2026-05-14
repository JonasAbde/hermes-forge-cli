# ACTIVE SESSION — Hermes Forge CLI — AgentOps Foundation

**Date:** 2026-05-14  
**Session:** agentops-cli  
**Status:** AgentOps foundation files created

---

## Summary

Created the AgentOps foundation for the Hermes Forge CLI repository. This establishes agent identity, skills, subagents, MCP configurations, security guardrails, and development workflows for AI-assisted development.

---

## What's Created

### Root
| File | Description |
|------|-------------|
| `AGENTS.md` | Agent identity — repo map, architecture notes, commands, build/test/release workflows |

### docs/
| File | Description |
|------|-------------|
| `PR_CHECKLIST.md` | PR checklist with CLI-specific items (build test, version bump, README examples) |
| `RELEASE_CHECKLIST.md` | Release checklist for npm publish (pre-publish test install, dry-run, post-publish verification) |
| `ACTIVE_SESSION.md` | This file — session tracking for AgentOps |

### .agentops/
| Path | Description |
|------|-------------|
| `README.md` | Directory overview with CLI-specific skills, subagents, MCP, and security |
| `skills/forge-cli-release.md` | Release management skill for CLI package |
| `skills/github-issue-to-pr.md` | Issue-to-PR workflow skill |
| `skills/long-session-protocol.md` | Protocol for extended development sessions |
| `skills/release-checklist.md` | Release checklist skill |
| `skills/mcp-security-audit.md` | Security audit skill |
| `skills/api-contract-review.md` | API contract review skill |
| `subagents/planner.json` | Planning subagent config |
| `subagents/code-reviewer.json` | Code review subagent config |
| `subagents/test-engineer.json` | Test engineering subagent config |
| `subagents/security-reviewer.json` | Security review subagent config |
| `subagents/frontend-qa.json` | Frontend QA subagent config (N/A for CLI) |
| `subagents/mobile-qa.json` | Mobile QA subagent config (N/A for CLI) |
| `subagents/docs-writer.json` | Documentation writer subagent config |
| `subagents/release-manager.json` | Release management subagent config |
| `mcp/github.readonly.json` | GitHub read-only MCP config |
| `mcp/github.write-approved.json` | GitHub write-approved MCP config |
| `mcp/playwright.json` | Playwright MCP config |
| `mcp/context7.json` | Context7 MCP config |
| `mcp/firecrawl.json` | Firecrawl MCP config |
| `security/GUARDRAILS.md` | Guardrails for AI-assisted development |
| `security/SECRETS_POLICY.md` | Secrets management policy |
| `security/BLAST_RADIUS.md` | Blast radius assessment (CLI-specific) |

---

## Architecture Notes

### CLI-Specific Adaptations

The AgentOps foundation for the CLI differs from the platform version:
- **No server/DB blast radius** — the CLI connects remotely, no local database
- **npm publish scope** — the primary blast radius is the npm package and user config
- **Skills omitted:** `frontend-ui-smoke`, `mobile-beta-qa` (not applicable to CLI)
- **Subagents kept for uniformity** but `frontend-qa` and `mobile-qa` noted as N/A

### MCP Configurations
- `github.readonly.json` — Read-only access to GitHub repos
- `github.write-approved.json` — Write access (PR creation, issue management)
- `playwright.json` — E2E test automation
- `context7.json` — Context retrieval
- `firecrawl.json` — Web crawling for documentation

### Security Model
- No secrets committed to repo
- Config directory (`~/.config/@hermes-forge/cli/`) has restricted permissions
- API keys stored locally in user config only
- All CLI API calls go through `ForgeApiClient` with Bearer token auth

---

## TODOs

- [ ] Verify all JSON configs parse correctly
- [ ] Ensure no hardcoded secrets in any file
- [ ] Create PR with title: "feat: AgentOps foundation — AGENTS.md, skills, subagents, MCP configs, guardrails"

---

## Next Steps

1. Push feature branch to origin
2. Open PR with enhancement label
3. PR body includes: summary, changed files, risks, verification results, next steps
