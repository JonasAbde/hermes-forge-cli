import { describe, it, expect } from 'vitest';
import { shouldSuppressPortInUseWarning } from '../src/lib/doctorPortWarnings.js';

describe('shouldSuppressPortInUseWarning', () => {
  it('returns false when service key missing', () => {
    expect(shouldSuppressPortInUseWarning(1, {})).toBe(false);
  });

  it('returns false when api skipped', () => {
    expect(
      shouldSuppressPortInUseWarning(1, {
        api: { skipped: true, reason: 'port not in use' },
      })
    ).toBe(false);
  });

  it('suppresses api port when health and ready ok', () => {
    expect(
      shouldSuppressPortInUseWarning(1, {
        api: {
          health: { bodyOk: true },
          ready: { bodyOk: true },
        },
      })
    ).toBe(true);
  });

  it('suppresses api port when health ok and stale ready 404', () => {
    expect(
      shouldSuppressPortInUseWarning(1, {
        api: {
          health: { bodyOk: true },
          ready: { bodyOk: false, staleReady404: true },
        },
      })
    ).toBe(true);
  });

  it('does not suppress api when health fails', () => {
    expect(
      shouldSuppressPortInUseWarning(1, {
        api: {
          health: { bodyOk: false },
          ready: { bodyOk: false },
        },
      })
    ).toBe(false);
  });

  it('suppresses docs when http status up', () => {
    expect(
      shouldSuppressPortInUseWarning(2, {
        docs: { status: 'up', responseTime: 2 },
      })
    ).toBe(true);
  });
});
