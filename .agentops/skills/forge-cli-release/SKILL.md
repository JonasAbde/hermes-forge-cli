---
name: forge-cli-release
description: Manage the release lifecycle for the @jonasabde/hermes-forge-cli npm package.
license: MIT
metadata: { "author": "AgentOps" }
---

# Forge CLI Release — AgentOps Skill

## Purpose
Manage the release lifecycle for the `@jonasabde/hermes-forge-cli` npm package.

## Triggers
- Version bump needed
- npm publish requested
- Release verification required

## Steps

### Pre-Release
1. Verify CI is green (build, lint, test)
2. Check `CHANGELOG.md` is up-to-date
3. Bump version with `npm version <major|minor|patch>`
4. Update README examples if needed

### Publish
1. `npm run build` — ensure clean build
2. `npm pack --dry-run` — verify contents
3. `npm publish --access public` — publish to npm
4. Verify: `npm view @jonasabde/hermes-forge-cli`

### Post-Release
1. `git push --tags`
2. Create GitHub Release from tag
3. Verify install: `npm install -g @jonasabde/hermes-forge-cli@<version>`

## Notes
- Package has `"type": "module"` — ESM only
- `prepublishOnly` script runs build automatically
- Config lives in `~/.config/@hermes-forge/cli/config.json`
- No server or database dependencies — pure CLI package
