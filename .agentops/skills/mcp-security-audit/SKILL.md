---
name: mcp-security-audit
description: Audit the project for security vulnerabilities using MCP tools and manual checks.
license: MIT
metadata:
  author: AgentOps
---

# MCP Security Audit — AgentOps Skill

## Purpose
Audit the project for security vulnerabilities using MCP tools and manual checks.

## Triggers
- Before releasing a new version
- When dependencies are updated
- When security issue is reported
- Periodic (monthly) audits

## Audit Checklist

### Dependency Security
- [ ] Check for known vulnerabilities: `npm audit`
- [ ] Review major dependency updates for breaking changes
- [ ] Verify lockfile integrity

### Code Security
- [ ] No hardcoded secrets, tokens, or API keys
- [ ] No shell injection vectors (execa with user input)
- [ ] No eval() or dynamic require()
- [ ] Input validation on all user-facing commands
- [ ] Cross-platform path handling (no hardcoded `/` separators)

### Config Security
- [ ] Config file permissions are restrictive (user-only read)
- [ ] API keys never printed in output or logs
- [ ] `--json` flag strips sensitive fields

### Supply Chain
- [ ] `package.json` `files` field is restrictive (only `dist/` and `bin/`)
- [ ] No unnecessary dependencies
- [ ] Check for deprecated packages

## Output
Report format: Structured with status (pass/fail/warn), finding, and remediation for each check.
