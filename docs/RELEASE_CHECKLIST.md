# Release Checklist — Hermes Forge CLI

> Package: `@jonasabde/hermes-forge-cli`  
> Registry: [npmjs.org](https://www.npmjs.com/package/@jonasabde/hermes-forge-cli)  
> Access: `public`

## Pre-Release

### Quality Gates
- [ ] All CI checks pass (build, lint, test)
- [ ] Tests pass locally: `npm test` → all green
- [ ] Build passes: `npm run build` → 0 errors
- [ ] Lint: `npm run lint` → 0 errors
- [ ] `prepublishOnly` script is `npm run build` (verified in `package.json`)

### Versioning
- [ ] Version bumped: `npm version <major|minor|patch>`
- [ ] `CHANGELOG.md` updated with new version entry and release date
- [ ] `README.md` up-to-date (verify command lists, examples)

### Documentation
- [ ] `docs/FORGE_CLI_RELEASE_CHECKLIST.md` reviewed for accuracy
- [ ] README examples verified (all commands work as documented)
- [ ] Help text verified: `forge --help` output matches README

## npm Publish

### Pre-Publish Verification
- [ ] `npm pack --dry-run` — verify package contents (only `dist/`, `bin/`, `package.json`, `README.md`)
- [ ] Run `npm install -g .` locally — install fresh and test `forge --help`
- [ ] Verify `bin/forge.js` shebang is correct (`#!/usr/bin/env node`)

### Publish
- [ ] npm token configured (with bypass 2FA or ready to handle OTP)
- [ ] Publish: `npm publish --access public`
- [ ] **If dry-run first:** `npm publish --access public --dry-run`

### Post-Publish Verification
- [ ] `npm view @jonasabde/hermes-forge-cli` shows new version
- [ ] `npx @jonasabde/hermes-forge-cli forge --version` returns expected version
- [ ] `npx @jonasabde/hermes-forge-cli forge --help` shows all commands (check count)
- [ ] Verify install from scratch: `npm install -g @jonasabde/hermes-forge-cli@<version>`

## GitHub

- [ ] `CHANGELOG.md` committed with new version
- [ ] Git tag created: `git tag v<version>`
- [ ] Tags pushed: `git push --tags`
- [ ] GitHub Release created from tag
- [ ] Release title and notes from `CHANGELOG.md`
- [ ] Attach any relevant release artifacts if needed

## Rollback Plan

If the release breaks:

1. **Immediate:** `npm unpublish @jonasabde/hermes-forge-cli@<version> --force`
   (within 72 hours of publish)
2. **Fix:** Identify issue, fix on branch, merge to `main`
3. **Re-release:** Bump patch version and repeat publish process

---

**Release Version:** ______  
**Date:** ______  
**Release Type:** [Major | Minor | Patch]  
**Status:** [Draft | Published | Rolled Back]
