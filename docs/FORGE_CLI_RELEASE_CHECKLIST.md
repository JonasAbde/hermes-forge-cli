# Forge CLI — v1 Release Checklist

> This document tracks everything required before publishing `@hermes-forge/cli` to npm as v1.0.0.

## Pre-Release Checklist

### 1. Version Bump

- [ ] Decide version: `1.0.0` (breaking? new features? patch?)
  - Current: `0.1.0` (pre-release)
  - Recommended: `1.0.0` for first stable release
- [ ] Update `version` field in `cli/package.json`
- [ ] Update `cli/README.md` version badge (if present)
- [ ] Commit: `chore(release): bump version to 1.0.0`

```bash
# Example version bump
cd cli
npm version 1.0.0 --no-git-tag-version
git add package.json
git commit -m "chore(release): bump version to 1.0.0"
```

### 2. Prepublish Tests

- [ ] Run full test suite: `npm test`
- [ ] Run type check: `npm run build`
- [ ] Run lint: `npm run lint`
- [ ] Verify `prepublishOnly` script in package.json:
  ```json
  "prepublishOnly": "npm run build"
  ```

### 3. Smoke Test — All Commands

Run every command and verify output:

```
# Core
forge --help
forge --version
forge version

# Status & diagnostics
forge status
forge doctor
forge monitor --once

# Remote / auth
forge remote status
forge remote login --help
forge remote me

# Pack management
forge pack list
forge pack build --help
forge pack validate --help
forge pack sync --dry-run
forge pack sync                    # expects 404 — graceful

# MCP
forge mcp --help

# Other
forge config --help
forge open --help
forge docs --help
forge completion --help
```

### 4. Build Verification

- [ ] `npm run build` — exit code 0, no errors
- [ ] `bin/forge.js` — executable and runs
- [ ] Verify `forge` binary resolves after npm link:

```bash
cd cli
npm link
forge --help    # should work system-wide
npm unlink      # clean up
```

### 5. npm Publish Access

- [ ] Registry access confirmed: `npm whoami`
- [ ] Package scope correct: `@hermes-forge/cli`
- [ ] Published package visibility: `npm publish --access public`

```bash
# Verify
npm whoami
npm access list packages @hermes-forge/cli
```

### 6. `package.json` Integrity Check

- [ ] `name` is correct (`@hermes-forge/cli`)
- [ ] `bin` maps correctly (`forge` → `./bin/forge.js`)
- [ ] `files` array includes `dist/` and `bin/`
- [ ] `main` points to `dist/index.js`
- [ ] `engines` (if present) specifies correct Node.js version
- [ ] Dependencies are production-only (no devDeps in published package)

### 7. Documentation

- [ ] `README.md` is accurate and up to date
- [ ] Screenshots/asciinema in README (optional but recommended)
- [ ] Changelog exists or is started

## npm Setup (First Time)

Before the first publish, create the npm org and gain access:

```bash
# 1. Login to npm (requires npm account)
npm login
# Follow prompts for username, password, OTP

# 2. Verify login
npm whoami
# → should show your npm username

# 3. Create the @hermes-forge org (if not already created)
npm org create @hermes-forge <your-username>
# You'll need an npm paid org account for private packages,
# or use --access public for public packages

# 4. Verify org access
npm access list packages @hermes-forge/cli

# 5. Dry-run before actual publish
npm publish --dry-run
# Verify: files list, bin paths, dependencies
```

## Release Procedure

```bash
# 1. On main branch, confirm everything is green
git checkout main
git pull origin main
cd cli

# 2. Final checks
npm run build
npm test                 # 133+ tests should pass

# 3. Verify version
node -e "console.log(require('./package.json').version)"
# → should show 1.0.0

# 4. Publish to npm
npm publish --access public

# 5. Tag the release
git tag -a v1.0.0 -m "Forge CLI v1.0.0"
git push origin v1.0.0

# 6. Verify published package
npm view @hermes-forge/cli
npm install -g @hermes-forge/cli
forge --version
```

## Rollback

### If npm publish fails after partial upload:

```bash
npm unpublish @hermes-forge/cli@1.0.0 --force
```

### If bugs found post-release:

```bash
# Option A: Patch
# Fix bug, bump to 1.0.1, publish

# Option B: Deprecate
npm deprecate @hermes-forge/cli@1.0.0 "contains bug X — use 1.0.1 instead"
```

### If CLI breaks for users:

```bash
# Users can roll back
npm install @hermes-forge/cli@0.1.0
```

## npm Blockers (Current) — All Resolved

| Blocker | Status | Notes |
|---------|--------|-------|
| Version bumped to `1.0.0` | ✅ Done | `cli/package.json` → 1.0.0 |
| npm access | ⏳ Requires `npm login` + org create | Steps documented above |
| `forge pack sync` backend endpoint | 🆕 Issue #174 | Backend task — CLI handles gracefully |
| CI pipeline | ✅ Already set up | `forge-cli-check` job in `.github/workflows/ci.yml` |
