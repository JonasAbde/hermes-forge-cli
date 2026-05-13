# Forge CLI — Release Checklist

> Updated for v2.0.0 — npmjs.org publish at `@jonasabde/hermes-forge-cli`

## Pre-Release

- [x] Version bumped to `2.0.0`
- [x] Build passes: `npm run build` → 0 errors
- [x] Tests pass: `npm test` → 29 tests
- [x] Lint: `npm run lint` → 0 errors
- [x] `prepublishOnly` script set to `npm run build`

## npm Publish

- [x] npm token configured with bypass 2FA
- [x] Package name: `@jonasabde/hermes-forge-cli`
- [x] Access: `--access public`
- [x] Published: v2.0.0 on npmjs.org ✅

```
npx @jonasabde/hermes-forge-cli forge --help
```

## GitHub

- [ ] CHANGELOG.md updated
- [ ] README.md updated with npm install instructions
- [ ] Release docs updated
- [ ] Git tag: `v2.0.0`
- [ ] GitHub Release created

## Verification

- [ ] `npm view @jonasabde/hermes-forge-cli` shows package
- [ ] `npx @jonasabde/hermes-forge-cli forge --version` returns 2.0.0
- [ ] All 27 commands listed in `forge --help`
