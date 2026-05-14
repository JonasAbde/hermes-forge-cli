# PR Checklist — Hermes Forge CLI

## Before Opening a PR

### Code Changes
- [ ] Code follows project conventions (ESM, TypeScript, ESLint)
- [ ] No dead code, console.logs, or commented-out code
- [ ] Commits are clean and descriptive
- [ ] Branch name follows convention: `feat/`, `fix/`, `chore/`, `docs/`

### CLI-Specific Items
- [ ] Build passes: `npm run build` → 0 errors
- [ ] Tests pass: `npm test` → all tests green
- [ ] Lint passes: `npm run lint` → 0 errors
- [ ] Version bump checked if API-breaking changes were made
- [ ] README examples verified (if command UX changed)
- [ ] New commands tested manually (if applicable)
- [ ] Help output updated: `forge --help` or `forge <command> --help`

### Testing Verification
- [ ] New functionality has test coverage
- [ ] Existing tests still pass
- [ ] Edge cases handled (empty input, missing config, network errors)
- [ ] No flaky or non-deterministic tests

### Documentation
- [ ] `README.md` updated if new commands, flags, or behaviors added
- [ ] `CHANGELOG.md` updated under `[Unreleased]`
- [ ] Inline JSDoc/TSDoc added for new public APIs
- [ ] Relevant `docs/` files updated

### Security
- [ ] No secrets, API keys, or tokens in code or committed files
- [ ] No shell injection vectors (avoid raw string interpolation in `execa` calls)
- [ ] Config file paths respect OS conventions (cross-platform)
- [ ] No unsafe `eval()` or dynamic `require()`

## Review Checklist

### Code Review
- [ ] Changes follow project conventions
- [ ] No unnecessary complexity
- [ ] Naming is clear and consistent
- [ ] Error messages are helpful and actionable
- [ ] No typos or formatting issues

### UX Review (CLI)
- [ ] Exit codes are correct (0 = success, 1 = error)
- [ ] JSON output mode (--json) works where applicable
- [ ] Spinner/human output is informative
- [ ] Help text is accurate

### Integration
- [ ] Works with existing commands (no regressions)
- [ ] Compatible with config persistence (conf package)
- [ ] Compatible with remote API (ForgeApiClient)

## Pre-Merge Actions

- [ ] At least 1 review approval
- [ ] All GitHub Actions pass (CI, lint, test)
- [ ] Branch is up-to-date with `main`
- [ ] No merge conflicts

## Post-Merge Actions

- [ ] Verify CI passes on `main`
- [ ] Notify team if breaking changes or new features
- [ ] Update release notes for next version

---

**PR Scope:** ______ files changed, ______ insertions, ______ deletions  
**Risk Level:** [Low | Medium | High]  
**Breaking Changes:** [Yes | No]
