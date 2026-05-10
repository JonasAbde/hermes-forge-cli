/**
 * Tests for 'forge version' and 'forge --version' — both should output the same version string
 */
import { describe, it, expect } from 'vitest';
import { execa } from 'execa';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function resolveCliEntry(): string {
  const paths = [
    join(process.cwd(), 'cli', 'dist', 'index.js'),
    join(process.cwd(), 'dist', 'index.js'),
    join(__dirname, '..', 'dist', 'index.js'),
  ];
  return paths.find(p => existsSync(p)) || paths[0];
}

const CLI_PATH = resolveCliEntry();

async function runForge(
  args: string[],
  opts: { cwd?: string; env?: Record<string, string>; timeout?: number } = {},
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const result = await execa('node', [CLI_PATH, ...args], {
      cwd: opts.cwd ?? process.cwd(),
      env: { ...process.env, ...opts.env },
      timeout: opts.timeout ?? 15000,
    });
    return { stdout: result.stdout, stderr: result.stderr, exitCode: 0 };
  } catch (error: unknown) {
    const e = error as { stdout?: string; stderr?: string; exitCode?: number };
    return {
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? '',
      exitCode: e.exitCode ?? 1,
    };
  }
}

describe('forge version', () => {
  it('forge --version outputs a version string', async () => {
    const result = await runForge(['--version']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('forge version outputs a version string', async () => {
    const result = await runForge(['version']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('forge --version and forge version output the same version', async () => {
    const versionFlag = await runForge(['--version']);
    const versionCmd = await runForge(['version']);
    expect(versionFlag.exitCode).toBe(0);
    expect(versionCmd.exitCode).toBe(0);
    // Both should output the same version number
    expect(versionFlag.stdout.trim()).toBe(versionCmd.stdout.trim());
  });
});
