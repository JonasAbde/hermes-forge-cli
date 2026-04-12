import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getActiveEnv, setActiveEnv } from '../../src/lib/envManager.js';
import { config } from '../../src/lib/configManager.js';

vi.mock('../../src/lib/configManager.js', () => {
  return {
    config: {
      get: vi.fn(),
      set: vi.fn(),
    }
  };
});

describe('envManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getActiveEnv', () => {
    it('returns "local" when activeEnvironment is not set', () => {
      vi.mocked(config.get).mockReturnValue({} as any);
      const result = getActiveEnv();
      expect(result).toBe('local');
    });

    it('returns the set activeEnvironment from config', () => {
      vi.mocked(config.get).mockReturnValue({ activeEnvironment: 'production' } as any);
      const result = getActiveEnv();
      expect(result).toBe('production');
    });
  });

  describe('setActiveEnv', () => {
    it('correctly updates the activeEnvironment in config', () => {
      setActiveEnv('staging');
      expect(config.set).toHaveBeenCalledWith('activeEnvironment', 'staging');
    });
  });
});
