/**
 * Tests for 'forge remote' subcommands — --help exits 0
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

describe('forge remote subcommands', () => {
  it('remote --help exits 0', async () => {
    const result = await runForge(['remote', '--help']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/usage/i);
  });

  it('remote status --help exits 0', async () => {
    const result = await runForge(['remote', 'status', '--help']);
    expect(result.exitCode).toBe(0);
  });

  it('remote packs --help exits 0', async () => {
    const result = await runForge(['remote', 'packs', '--help']);
    expect(result.exitCode).toBe(0);
  });

  it('remote me --help exits 0', async () => {
    const result = await runForge(['remote', 'me', '--help']);
    expect(result.exitCode).toBe(0);
  });

  it('remote login --help exits 0', async () => {
    const result = await runForge(['remote', 'login', '--help']);
    expect(result.exitCode).toBe(0);
  });
});
