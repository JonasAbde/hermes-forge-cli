# GitHub Issue to PR — AgentOps Skill

## Purpose
Convert a GitHub issue into a well-structured pull request with commits, branching, and documentation.

## Triggers
- New issue assigned that needs code changes
- Bug report with reproduction steps
- Feature request with clear requirements

## Steps

1. **Read the issue** — Understand the request, reproduce if bug
2. **Create branch** — `feat/<description>` or `fix/<description>`
3. **Implement changes** — Follow project conventions (ESM, TypeScript)
4. **Write/update tests** — Vitest, cover edge cases
5. **Update docs** — README, help text, and relevant docs/
6. **Lint and build** — `npm run lint && npm run build`
7. **Commit** — Descriptive commits with issue reference
8. **Push and create PR** — Reference issue in PR body
9. **Request review** — Add labels and assignees

## Notes
- CLI repo uses Vitest for testing
- All commands must have `--help` output
- Breaking changes require version bump in CHANGELOG.md
