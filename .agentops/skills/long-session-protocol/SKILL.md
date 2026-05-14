---
name: long-session-protocol
description: Handle extended, multi-step development sessions that span context windows, file operations, and decision-making.
license: MIT
metadata: { "author": "AgentOps" }
---

# Long Session Protocol — AgentOps Skill

## Purpose
Handle extended, multi-step development sessions that span context windows, file operations, and decision-making.

## Protocol

### Session Start
1. Read ACTIVE_SESSION.md (archive old one to ACTIVE_SESSION_<date>.md)
2. Read relevant AGENTS.md sections
3. Review current branch and any in-progress work
4. Establish session goals and constraints

### During Session
1. Commit frequently with descriptive messages
2. Update ACTIVE_SESSION.md after major milestones
3. Keep BLAST_RADIUS.md in mind for risky changes
4. Run CI checks before significant commits

### Session Handoff
1. Update ACTIVE_SESSION.md with current state
2. List any known issues or blockers
3. Note next steps clearly
4. Ensure working tree is clean (or staged)

### Session Resume
1. Read latest ACTIVE_SESSION.md
2. Review git log for changes
3. Re-read relevant context files
4. Continue from last checkpoint

## Notes
- Use `docs/` for persistent documentation
- This file is for the agent, not the README
- Break large tasks into subagent spawns when appropriate
