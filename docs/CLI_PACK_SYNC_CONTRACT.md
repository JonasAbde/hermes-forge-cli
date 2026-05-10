# CLI Pack Sync — Backend API Contract

## Overview

`forge pack sync` uploads local pack catalog entries to a remote Hermes Forge instance. This document describes the backend API endpoint that needs to be implemented.

## Endpoint

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/api/forge/v1/admin/packs/sync` | Bearer token (admin only) |

## Request

```
POST /api/forge/v1/admin/packs/sync
Authorization: Bearer <api-key>
Content-Type: application/json
```

### Body

```json
{
  "packs": [
    {
      "pack_id": "com.example.my-pack",
      "name": "My Pack",
      "description": "...",
      "version": "1.0.0",
      "author": "...",
      "skills": [...],
      "tags": [...],
      "icon_url": "...",
      "category": "..."
    }
  ]
}
```

The `packs` array comes directly from the local `catalog.json` file. Each item in the array represents one pack that should be created or updated on the remote instance.

## Response

### Success (200)

```json
{
  "synced": 42,
  "errors": []
}
```

### Partial Success (200)

```json
{
  "synced": 40,
  "errors": [
    "pack com.example.broken: missing required field 'version'",
    "pack com.example.duplicate: pack_id already exists"
  ]
}
```

### Unauthorized (401)

Standard 401 response.

### Not Found (404)

Returned if the endpoint is not yet deployed.

## Sync Logic (Backend)

1. For each pack in the request body:
   - **If pack_id exists** in remote DB: update fields (upsert)
   - **If pack_id is new**: insert as new pack
2. Validate each pack:
   - `pack_id` is required, unique (reverse-domain format recommended)
   - `name` is required
3. Return count of successfully synced packs + any per-pack errors
4. The endpoint should be idempotent — re-running should not produce duplicates

## Security

- Only authenticated admin users should be able to call this endpoint
- Validate the Bearer token against the same auth as the rest of the admin API
- Rate limit: 10 requests per minute per API key

## Implementation Priority

**Medium** — CLI already works correctly without this endpoint:
- `forge pack sync --dry-run` shows what would be synced (fully functional)
- `forge pack sync` without dry-run gracefully reports 404 and suggests backend implementation
