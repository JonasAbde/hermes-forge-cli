# Guardrails — Hermes Forge CLI

## Behavioral Rules for AI-Assisted Development

### Never
- **Commit secrets:** No API keys, tokens, passwords, or private keys in code
- **Leak config data:** Don't read or expose `~/.config/@hermes-forge/cli/config.json` contents
- **Modify production:** Never deploy or publish without human approval
- **Run destructive commands:** No `rm -rf`, forced pushes, or mass deletions without confirmation
- **Bypass security checks:** Always run `npm audit`, lint, and test before suggesting merge

### Always
- **Check context first:** Read AGENTS.md, BLAST_RADIUS.md, and relevant docs before making changes
- **Request approval for external actions:** Publishing, pushing tags, modifying GitHub issues
- **Prefer small, focused commits:** One logical change per commit with descriptive messages
- **Validate JSON:** All `.json` files must parse correctly before committing
- **Document decisions:** Update ACTIVE_SESSION.md and CHANGELOG.md as appropriate

### CLI-Specific
- **Verify build:** Always run `npm run build` after TypeScript changes
- **Test before commit:** `npm test` must pass
- **Check cross-platform:** Commands must work on Linux, macOS, and Windows
- **No hardcoded paths:** Use `os.homedir()`, `path.join()`, and platform-aware patterns
- **Help text matters:** Every command must have clear `--help` output
