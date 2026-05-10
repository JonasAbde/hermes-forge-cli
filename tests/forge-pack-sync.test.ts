/**
 * Tests for 'forge pack sync' subcommand
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

describe('forge pack sync', () => {
  it('pack sync --help exits 0', async () => {
    const result = await runForge(['pack', 'sync', '--help']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/sync/i);
  });

  it('pack sync --dry-run shows packs (may fail gracefully outside repo)', async () => {
    // Run in /tmp so no catalog is found — should exit 1 with error, not crash
    const result = await runForge(['pack', 'sync', '--dry-run'], { cwd: '/tmp' });
    // It's fine if exitCode is 1 due to no catalog; should mention it
    expect(result.stdout + result.stderr).toMatch(/catalog/i);
  });
});
