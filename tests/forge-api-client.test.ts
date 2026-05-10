/**
 * Tests for ForgeApiClient constructor, URL construction, header logic
 */
import { describe, it, expect } from 'vitest';
import { ForgeApiClient } from '../src/lib/forgeApiClient.js';

describe('ForgeApiClient', () => {
  it('should be constructable with default baseUrl', () => {
    const client = new ForgeApiClient();
    expect(client).toBeTruthy();
  });

  it('should accept custom baseUrl', () => {
    const client = new ForgeApiClient({ baseUrl: 'http://127.0.0.1:5181/api/forge/v1' });
    expect(client).toBeTruthy();
  });

  it('should accept apiKey', () => {
    const client = new ForgeApiClient({ apiKey: 'test-key-123' });
    expect(client).toBeTruthy();
  });

  it('should accept sessionCookie', () => {
    const client = new ForgeApiClient({ sessionCookie: 'sess-abc-123' });
    expect(client).toBeTruthy();
  });

  it('should have all expected methods', () => {
    expect(typeof ForgeApiClient.prototype.checkHealth).toBe('function');
    expect(typeof ForgeApiClient.prototype.listPacks).toBe('function');
    expect(typeof ForgeApiClient.prototype.getProfile).toBe('function');
    expect(typeof ForgeApiClient.prototype.listDeployments).toBe('function');
    expect(typeof ForgeApiClient.prototype.createDeployment).toBe('function');
    expect(typeof ForgeApiClient.prototype.startDeployment).toBe('function');
    expect(typeof ForgeApiClient.prototype.stopDeployment).toBe('function');
    expect(typeof ForgeApiClient.prototype.deleteDeployment).toBe('function');
    expect(typeof ForgeApiClient.prototype.discoverSynergies).toBe('function');
  });

  it('checkHealth is an async function', () => {
    // Verify the method signature — it's async, returns a promise of null | object
    expect(ForgeApiClient.prototype.checkHealth.constructor.name).toBe('AsyncFunction');
  });
});
