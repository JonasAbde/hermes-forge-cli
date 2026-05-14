# Secrets Policy — Hermes Forge CLI

## Types of Secrets

| Type | Location | Handling |
|------|----------|----------|
| API keys | `~/.config/@hermes-forge/cli/config.json` | Never commit, never print in output |
| npm tokens | Environment variable `NPM_TOKEN` or `.npmrc` | Never commit `.npmrc` |
| GitHub tokens | Environment variable `GH_TOKEN` | Use GitHub Actions secrets for CI |

## Rules

### DO
- Store API keys in user config directory (`~/.config/@hermes-forge/cli/`)
- Use environment variables for CI secrets
- Use `.env.example` for documentation (without real values)
- Strip sensitive fields in `--json` output mode
- Add sensitive files to `.gitignore`

### DON'T
- Hardcode secrets in source code
- Include tokens in commit messages
- Log API keys or tokens in debug output
- Store secrets in `src/`, `docs/`, or any committed directory
- Add config files with real secrets to `.gitignore` samples

## Detection

- Run `git diff --check` before commits to catch accidental secrets
- Use `npm audit` for dependency vulnerability scanning
- Review PRs for hardcoded credentials
- Check for common secret patterns (Bearer tokens, api_key, password, secret)

## Incident Response

If a secret is committed:
1. **Immediately** revoke the exposed secret
2. **Remove** from git history with `git filter-branch` or BFG Repo-Cleaner
3. **Rotate** any services using the exposed credential
4. **Document** the incident and update policy to prevent recurrence
