# Forge CLI — Auth Flow

## Overview

Forge CLI supports two authentication methods:

1. **API key** (primary) — set via `forge remote login --api-key <key>`
2. **Session cookie** (browser login) — initiated via `forge remote login` (opens browser)

## API Key Flow

### Setting a Key

```bash
# Direct key entry
forge remote login --api-key <your-api-key>

# This saves to ~/.config/@hermes-forge/cli/config.json
# The config file stores: { remote: { baseUrl, apiKey } }
```

The key is stored in `config.set('remote.apiKey')` via the `conf` npm package, which saves to:
- Linux: `~/.config/@hermes-forge/cli/config.json`
- macOS: `~/Library/Preferences/@hermes-forge/cli/config.json`
- Windows: `%APPDATA%/@hermes-forge/cli/config.json`

### Verifying Authentication

```bash
# Check connectivity + auth status
forge remote status

# View your profile
forge remote me
```

### Updating a Key

```bash
forge remote login --api-key <new-key>
```

Simply overwrites the saved key.

### How the Key is Used

Every API call via `ForgeApiClient` sends:

```
Authorization: Bearer <api-key>
```

in the request headers. The key is never logged or shown in CLI output.

## Browser Login Flow

```bash
forge remote login
```
Opens `https://forge.tekup.dk/login` in the default browser. After authenticating in the browser, the session cookie needs to be extracted and saved manually (not yet automated).

## Session Cookie (Alternative)

The `ForgeApiClient` supports session cookie authentication:

```typescript
headers['Cookie'] = `forge_session=${sessionCookie}`;
```

The session cookie is NOT currently stored or managed by the CLI — it's a future enhancement.

## Security Notes

- **API keys are stored in plaintext** in the config file (readable only by you due to `~/.config` permissions)
- API keys are never printed in CLI output, logs, or error messages
- The `--json` flag on `forge remote me` explicitly strips sensitive fields
- Keys should be rotated periodically via the Forge admin panel
- Never commit your config file or API keys to version control

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "No API key set" | `forge remote login --api-key <key>` |
| "Authentication failed" | Key is invalid or expired — update with `forge remote login --api-key <new-key>` |
| "Could not reach server" | Check if Forge instance is running and network is available |
| "Connection refused" | Server may be down or firewall blocking |

## Future Enhancements

- [ ] Automated session cookie extraction from browser login
- [ ] API key rotation notification
- [ ] Multi-instance auth profiles
