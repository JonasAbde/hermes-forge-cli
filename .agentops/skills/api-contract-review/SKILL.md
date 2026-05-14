---
name: api-contract-review
description: Review API contracts (endpoints, request/response shapes, auth) between the CLI and the Hermes Forge Platform API.
license: MIT
metadata: { "author": "AgentOps" }
---

# API Contract Review — AgentOps Skill

## Purpose
Review API contracts (endpoints, request/response shapes, auth) between the CLI and the Hermes Forge Platform API.

## Triggers
- Adding a new API command
- Changing existing API interactions
- Updating ForgeApiClient

## Review Checklist

### Endpoint Contract
- [ ] Method and path match the API server
- [ ] Auth mechanism documented (Bearer token / cookie)
- [ ] Request body schema matches (validate with Zod if applicable)
- [ ] Response shape matches (check for pagination, error formats)
- [ ] Error handling covers all HTTP status codes (4xx, 5xx)

### Client Implementation
- [ ] `ForgeApiClient` correctly sets headers
- [ ] Timeouts and retries configured
- [ ] Error messages are user-friendly (not raw JSON)
- [ ] `--json` mode returns structured data when requested

### Breaking Changes
- [ ] If API changed, is there a version compatibility layer?
- [ ] Old CLI + new API still works? New CLI + old API?

## Notes
- CLI connects to `forge.tekup.dk` (production) or local dev instances
- Auth via Bearer token or session cookie
- All admin endpoints require admin-level API key
