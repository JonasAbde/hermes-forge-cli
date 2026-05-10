/**
 * Tests for forge pack sync — missing endpoint, no catalog, auth behavior
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

describe('forge pack sync endpoint handling', () => {
  it('pack sync without catalog gives clear error message', async () => {
    const result = await runForge(['pack', 'sync'], { cwd: '/tmp' });
    const output = result.stdout + result.stderr;
    expect(output).toMatch(/catalog/i);
  });

  it('pack sync --dry-run without catalog mentions catalog', async () => {
    const result = await runForge(['pack', 'sync', '--dry-run'], { cwd: '/tmp' });
    const output = result.stdout + result.stderr;
    expect(output).toMatch(/catalog/i);
  });

  it('pack sync --help shows flags', async () => {
    const result = await runForge(['pack', 'sync', '--help']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/dry.run/i);
    expect(result.stdout).toMatch(/target/i);
    expect(result.stdout).toMatch(/api.key/i);
  });

  it('pack sync output does not mention missing endpoint on dry-run help', async () => {
    // --help should show usage options, not talk about missing backends
    const result = await runForge(['pack', 'sync', '--help']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toMatch(/404|not.*deployed/i);
  });

  it('pack sync --help describes the command purpose', async () => {
    const result = await runForge(['pack', 'sync', '--help']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/sync/i);
  });

  it('pack sync output does not contain API keys in plaintext', async () => {
    const result = await runForge(['pack', 'sync', '--help']);
    expect(result.stdout).not.toMatch(/sk-[a-zA-Z0-9]{20,}|[A-Za-z0-9]{32,}/);
  });
});
