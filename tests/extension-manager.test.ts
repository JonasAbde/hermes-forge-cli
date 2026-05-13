/**
 * Tests for the Forge CLI extension/plugin system
 * Covers: manifest loading, extension discovery, command injection
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { Command } from 'commander';

const EXT_TEST_DIR = join(homedir(), '.forge', 'extensions', 'test-ext');

describe('extension manager', () => {
  beforeEach(() => {
    // Clean and create test extension
    if (existsSync(EXT_TEST_DIR)) {
      rmSync(EXT_TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(EXT_TEST_DIR, { recursive: true });

    writeFileSync(join(EXT_TEST_DIR, 'manifest.yaml'), `
name: test-ext
version: 1.0.0
description: "Test extension"

commands:
  - name: hello
    description: "Say hello"
    module: "hello.js"

hooks:
  onInit: "init.js"
`, 'utf-8');

    writeFileSync(join(EXT_TEST_DIR, 'hello.js'), `
export default async function hello() {
  return 'hello from extension';
}
`, 'utf-8');

    writeFileSync(join(EXT_TEST_DIR, 'init.js'), `
export default async function init(ctx) {
  // no-op
}
`, 'utf-8');
  });

  afterEach(async () => {
    if (existsSync(EXT_TEST_DIR)) {
      rmSync(EXT_TEST_DIR, { recursive: true, force: true });
    }
    // Clear extension cache
    const { clearExtensionCache } = await import('../src/lib/extensionManager.js');
    clearExtensionCache();
  }, 10000);

  it('loadExtensions finds test extension', async () => {
    const { loadExtensions } = await import('../src/lib/extensionManager.js');
    const exts = loadExtensions();
    expect(exts.length).toBeGreaterThanOrEqual(1);
    const testExt = exts.find(e => e.manifest.name === 'test-ext');
    expect(testExt).toBeDefined();
    expect(testExt!.manifest.version).toBe('1.0.0');
    expect(testExt!.manifest.commands).toHaveLength(1);
    expect(testExt!.manifest.commands![0].name).toBe('hello');
  });

  it('loadExtensions returns extension with hooks', async () => {
    const { loadExtensions } = await import('../src/lib/extensionManager.js');
    const exts = loadExtensions();
    const testExt = exts.find(e => e.manifest.name === 'test-ext');
    expect(testExt!.manifest.hooks).toBeDefined();
    expect(testExt!.manifest.hooks!.onInit).toBe('init.js');
  });

  it('isExtensionInstalled returns true for test extension', async () => {
    const { isExtensionInstalled } = await import('../src/lib/extensionManager.js');
    expect(isExtensionInstalled('test-ext')).toBe(true);
  });

  it('isExtensionInstalled returns false for missing extension', async () => {
    const { isExtensionInstalled } = await import('../src/lib/extensionManager.js');
    expect(isExtensionInstalled('nonexistent-ext')).toBe(false);
  });

  it('extensionCount returns positive number', async () => {
    const { extensionCount } = await import('../src/lib/extensionManager.js');
    expect(extensionCount()).toBeGreaterThanOrEqual(1);
  });

  it('injectExtensionCommands registers command on program', async () => {
    const { injectExtensionCommands, loadExtensions } = await import('../src/lib/extensionManager.js');
    // Force reload
    const { clearExtensionCache } = await import('../src/lib/extensionManager.js');
    clearExtensionCache();
    loadExtensions();

    const program = new Command();
    injectExtensionCommands(program);

    const cmd = program.commands.find(c => c.name() === 'ext-test-ext:hello');
    expect(cmd).toBeDefined();
    expect(cmd!.description()).toContain('Say hello');
  });

  it('ensureExtensionDirs creates user extension directory', async () => {
    const { ensureExtensionDirs, getUserExtensionDir } = await import('../src/lib/extensionManager.js');
    ensureExtensionDirs();
    expect(existsSync(getUserExtensionDir())).toBe(true);
  });

  it('loadExtensions fails gracefully with invalid manifest', async () => {
    // Create invalid manifest
    writeFileSync(join(EXT_TEST_DIR, 'manifest.yaml'), 'invalid: yaml: : :', 'utf-8');
    const { loadExtensions } = await import('../src/lib/extensionManager.js');
    // Should not throw, should just skip
    const exts = loadExtensions();
    const badExt = exts.find(e => e.manifest.name === 'test-ext');
    expect(badExt).toBeUndefined();
  });

  it('loadExtensions fails gracefully without manifest file', async () => {
    // Remove manifest
    rmSync(join(EXT_TEST_DIR, 'manifest.yaml'));
    const { loadExtensions } = await import('../src/lib/extensionManager.js');
    const exts = loadExtensions();
    const missingExt = exts.find(e => e.manifest.name === 'test-ext');
    expect(missingExt).toBeUndefined();
  });

  it('clearExtensionCache clears cached extensions', async () => {
    const { loadExtensions, clearExtensionCache } = await import('../src/lib/extensionManager.js');
    const before = loadExtensions();
    clearExtensionCache();
    const after = loadExtensions();
    expect(after).toEqual(before);
  });
});

// Helper for async import in beforeEach
function await_import(modulePath: string) {
  let mod: any = {};
  const p = import(modulePath).then(m => { mod = m; });
  return {
    clearExtensionCache() { mod.clearExtensionCache?.(); },
    loadExtensions() { mod.loadExtensions?.(); },
  };
}
