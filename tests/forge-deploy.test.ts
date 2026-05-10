/**
 * Tests for 'forge deploy' subcommands — --help exits 0
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

describe('forge deploy subcommands', () => {
  it('deploy --help exits 0', async () => {
    const result = await runForge(['deploy', '--help']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/usage/i);
  });

  it('deploy list --help exits 0', async () => {
    const result = await runForge(['deploy', 'list', '--help']);
    expect(result.exitCode).toBe(0);
  });

  it('deploy create --help exits 0', async () => {
    const result = await runForge(['deploy', 'create', '--help']);
    expect(result.exitCode).toBe(0);
  });

  it('deploy start --help exits 0', async () => {
    const result = await runForge(['deploy', 'start', '--help']);
    expect(result.exitCode).toBe(0);
  });

  it('deploy stop --help exits 0', async () => {
    const result = await runForge(['deploy', 'stop', '--help']);
    expect(result.exitCode).toBe(0);
  });

  it('deploy delete --help exits 0', async () => {
    const result = await runForge(['deploy', 'delete', '--help']);
    expect(result.exitCode).toBe(0);
  });
});
