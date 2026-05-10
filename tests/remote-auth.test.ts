/**
 * Tests for forge remote auth behavior — missing token, no config, etc.
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

describe('forge remote auth behavior', () => {
  // These tests run without an API key configured — should give clear errors

  it('remote me without config gives error about missing remote', async () => {
    // Run in /tmp with empty config to ensure no auth leak
    const result = await runForge(['remote', 'me'], {
      env: { HOME: '/tmp/nonexistent-home' },
      cwd: '/tmp',
    });
    // Should mention missing config, not crash
    expect(result.stdout + result.stderr).toMatch(/no remote configured|no api key/i);
  });

  it('remote status with --json has no secrets in output', async () => {
    const result = await runForge(['remote', 'me', '--json'], {
      env: { HOME: '/tmp/nonexistent-home' },
      cwd: '/tmp',
    });
    // JSON output should not contain apiKey, token, secret, password
    const output = result.stdout + result.stderr;
    expect(output).not.toMatch(/apiKey|api_key|token|secret|password/i);
  });

  it('remote login --help shows api-key option', async () => {
    const result = await runForge(['remote', 'login', '--help']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/api-key/i);
  });

  it('remote me without auth mentions login command', async () => {
    const result = await runForge(['remote', 'me'], {
      env: { HOME: '/tmp/nonexistent-home' },
      cwd: '/tmp',
    });
    const output = (result.stdout + result.stderr).toLowerCase();
    // Should mention how to authenticate
    expect(output).toMatch(/login|authenticate|api.key/);
  });

  it('remote status with no auth is non-fatal', async () => {
    const result = await runForge(['remote', 'status'], {
      env: { HOME: '/tmp/nonexistent-home' },
      cwd: '/tmp',
    });
    // Should not crash — exit may be 0 or 1 but no exception
    expect(result.stderr).not.toMatch(/uncaught|exception/i);
  });
});
