---
name: release-checklist
description: Guide the agent through a complete release process with verification gates.
license: MIT
metadata: { "author": "AgentOps" }
---

# Release Checklist — AgentOps Skill

## Purpose
Guide the agent through a complete release process with verification gates.

## When to Use
- When asked to publish a new version
- During the "release" phase of project lifecycle
- When verifying a previous release

## Process

### Gate 1: Readiness
- [ ] All issues/PRs for this release are merged
- [ ] CHANGELOG.md is up-to-date
- [ ] README reflects current state
- [ ] CI is green on main branch

### Gate 2: Build & Test
- [ ] `npm run build` succeeds
- [ ] `npm test` passes
- [ ] `npm run lint` passes

### Gate 3: Version & Tag
- [ ] Version bumped in package.json
- [ ] Git tag created (`v<version>`)
- [ ] Tag pushed to origin

### Gate 4: Publish
- [ ] `npm publish --dry-run` checks pass
- [ ] Published to npm
- [ ] Version verified on npm registry

### Gate 5: Verify
- [ ] Can install fresh: `npm install -g @jonasabde/hermes-forge-cli`
- [ ] Help output matches expected
- [ ] GitHub Release created from tag
