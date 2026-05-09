import { describe, it, expect } from 'vitest';
describe('ForgeApiClient', () => {
  it('should be constructable with default baseUrl', async () => {
    const mod = await import('../src/lib/forgeApiClient.js');
    const client = new mod.ForgeApiClient();
    expect(client).toBeTruthy();
  });
  it('should accept custom baseUrl', async () => {
    const mod = await import('../src/lib/forgeApiClient.js');
    const client = new mod.ForgeApiClient({ baseUrl: 'http://127.0.0.1:5181/api/forge/v1' });
    expect(client).toBeTruthy();
  });
  it('should accept apiKey', async () => {
    const mod = await import('../src/lib/forgeApiClient.js');
    const client = new mod.ForgeApiClient({ apiKey: 'test-key-123' });
    expect(client).toBeTruthy();
  });
});
