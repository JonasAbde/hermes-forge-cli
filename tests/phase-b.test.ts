/**
 * Phase B: CLI command fixes and new features
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { execa } from 'execa';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { existsSync } from 'fs';
import { mkdir, writeFile, rm, readFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function resolveCliEntry(): string {
  const fromRepoRoot = join(process.cwd(), 'cli', 'dist', 'index.js');
  const fromCliWorkspace = join(process.cwd(), 'dist', 'index.js');
  const fromTestFile = join(__dirname, '..', 'dist', 'index.js');
  if (existsSync(fromRepoRoot)) return fromRepoRoot;
  if (existsSync(fromCliWorkspace)) return fromCliWorkspace;
  return fromTestFile;
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

describe('Phase B: CLI improvements', () => {
  // ─── interactive command is registered ───────────────────────────────────
  describe('interactive command registration', () => {
    it('forge interactive --help should work', async () => {
      const result = await runForge(['interactive', '--help']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/interactive/i);
    });

    it('forge i --help (alias) should work', async () => {
      const result = await runForge(['i', '--help']);
      expect(result.exitCode).toBe(0);
    });
  });

  // ─── open command ─────────────────────────────────────────────────────────
  describe('open command', () => {
    it('--help lists all valid targets including catalog and chat', async () => {
      const result = await runForge(['open', '--help']);
      expect(result.exitCode).toBe(0);
      // The help shows the argument description
      expect(result.stdout).toMatch(/docs.*hub.*showcase.*catalog.*chat.*api/is);
    });

    it('rejects unknown target with exit code 1', async () => {
      const result = await runForge(['open', 'nonexistent-target-xyz']);
      expect(result.exitCode).toBe(1);
      expect(result.stdout + result.stderr).toMatch(/unknown target/i);
    });
  });

  // ─── alias command ────────────────────────────────────────────────────────
  describe('alias command', () => {
    it('alias list --help exits 0', async () => {
      const result = await runForge(['alias', 'list', '--help']);
      expect(result.exitCode).toBe(0);
    });

    it('alias set --help exits 0', async () => {
      const result = await runForge(['alias', 'set', '--help']);
      expect(result.exitCode).toBe(0);
    });

    it('alias run --help exits 0', async () => {
      const result = await runForge(['alias', 'run', '--help']);
      expect(result.exitCode).toBe(0);
    });

    it('alias run exits 1 for an unknown alias', async () => {
      const result = await runForge(['alias', 'run', '__nonexistent_alias_xyz__']);
      expect(result.exitCode).toBe(1);
      expect(result.stdout + result.stderr).toMatch(/unknown alias/i);
    });

    it('alias init --help exits 0', async () => {
      const result = await runForge(['alias', 'init', '--help']);
      expect(result.exitCode).toBe(0);
    });
  });

  // ─── completion command ───────────────────────────────────────────────────
  describe('completion command', () => {
    for (const shell of ['bash', 'zsh', 'fish'] as const) {
      it(`completion ${shell} --print includes all top-level commands`, async () => {
        const result = await runForge(['completion', shell, '--print']);
        expect(result.exitCode).toBe(0);
        // Spot-check a few commands that were previously missing
        const out = result.stdout;
        expect(out).toMatch(/backup/);
        expect(out).toMatch(/upgrade/);
        expect(out).toMatch(/workspace/);
        expect(out).toMatch(/alias/);
        expect(out).toMatch(/interactive/);
        expect(out).toMatch(/notify/);
        expect(out).toMatch(/schedule/);
      });
    }

    it('completion bash --print includes forge-api-proxy in dev completions', async () => {
      const result = await runForge(['completion', 'bash', '--print']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/forge-api-proxy/);
    });

    it('completion zsh --print includes catalog and chat open targets', async () => {
      const result = await runForge(['completion', 'zsh', '--print']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/catalog/);
      expect(result.stdout).toMatch(/chat/);
    });

    it('completion fish --print includes catalog and chat open targets', async () => {
      const result = await runForge(['completion', 'fish', '--print']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/catalog/);
      expect(result.stdout).toMatch(/chat/);
    });

    it('rejects unknown shell', async () => {
      const result = await runForge(['completion', 'powershell']);
      expect(result.exitCode).toBe(1);
      expect(result.stdout + result.stderr).toMatch(/unknown shell/i);
    });
  });

  // ─── config command ───────────────────────────────────────────────────────
  describe('config command', () => {
    it('config get exits 0 and returns JSON', async () => {
      const result = await runForge(['config', 'get']);
      expect(result.exitCode).toBe(0);
      // Extract the JSON object (may have header before and info line after)
      const jsonStart = result.stdout.indexOf('{');
      const jsonEnd = result.stdout.lastIndexOf('}');
      expect(jsonStart).toBeGreaterThanOrEqual(0);
      const parsed = JSON.parse(result.stdout.slice(jsonStart, jsonEnd + 1)) as Record<string, unknown>;
      expect(parsed).toHaveProperty('ports');
    });

    it('config get <key> returns a scalar value', async () => {
      const result = await runForge(['config', 'get', 'browser']);
      expect(result.exitCode).toBe(0);
      // Should be 'default' or similar string, not an object
      expect(result.stdout.trim()).toBeTruthy();
    });

    it('config get <nested key> returns the nested value', async () => {
      const result = await runForge(['config', 'get', 'ports.web']);
      expect(result.exitCode).toBe(0);
      // Should be a number (default 5180)
      expect(Number(result.stdout.trim())).toBeGreaterThan(0);
    });

    it('config get --json on a scalar still returns valid JSON', async () => {
      const result = await runForge(['config', 'get', 'browser', '--json']);
      expect(result.exitCode).toBe(0);
      // Should be a quoted JSON string
      expect(() => JSON.parse(result.stdout)).not.toThrow();
    });

    it('config set browser chrome then get returns chrome', async () => {
      await runForge(['config', 'set', 'browser', 'chrome']);
      const result = await runForge(['config', 'get', 'browser']);
      expect(result.stdout.trim()).toBe('chrome');
      // Restore default
      await runForge(['config', 'set', 'browser', 'default']);
    });

    it('config set ports.web 5200 updates the nested port', async () => {
      await runForge(['config', 'set', 'ports.web', '5200']);
      const result = await runForge(['config', 'get', 'ports.web']);
      expect(result.stdout.trim()).toBe('5200');
      // Restore default
      await runForge(['config', 'set', 'ports.web', '5180']);
    });

    it('config reset --help exits 0', async () => {
      const result = await runForge(['config', 'reset', '--help']);
      expect(result.exitCode).toBe(0);
    });
  });

  // ─── pack commands use resolveRepoRoot ────────────────────────────────────
  describe('pack commands with FORGE_REPO_ROOT', () => {
    const repoRoot = join(process.cwd(), '..').includes('hermes-forge-platform')
      ? join(process.cwd(), '..')
      : join(__dirname, 'fixtures');

    it('pack list exits 0 with FORGE_REPO_ROOT', async () => {
      const result = await runForge(['pack', 'list'], { env: { FORGE_REPO_ROOT: repoRoot } });
      expect(result.exitCode).toBe(0);
      expect(result.stdout + result.stderr).toMatch(/pack|catalog/i);
    });

    it('pack list --json exits 0 and returns array', async () => {
      const result = await runForge(['pack', 'list', '--json'], { env: { FORGE_REPO_ROOT: repoRoot } });
      expect(result.exitCode).toBe(0);
      // Strip any header banner and find the JSON array
      const jsonStart = result.stdout.indexOf('[');
      expect(jsonStart).toBeGreaterThanOrEqual(0);
      const parsed = JSON.parse(result.stdout.slice(jsonStart)) as unknown[];
      expect(Array.isArray(parsed)).toBe(true);
    });

    it('pack validate all exits 0 when all packs are valid', async () => {
      const result = await runForge(['pack', 'validate', 'all'], { env: { FORGE_REPO_ROOT: repoRoot } });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/passed|valid/i);
    });

    it('pack validate all --strict exits 0 with valid catalog', async () => {
      const result = await runForge(['pack', 'validate', 'all', '--strict'], { env: { FORGE_REPO_ROOT: repoRoot } });
      expect(result.exitCode).toBe(0);
    });

    it('pack metadata exits 0 and returns JSON array', async () => {
      const result = await runForge(['pack', 'metadata'], { env: { FORGE_REPO_ROOT: repoRoot } });
      expect(result.exitCode).toBe(0);
      // Find the JSON array in the output (may be multi-line)
      const jsonStart = result.stdout.indexOf('[');
      const jsonEnd = result.stdout.lastIndexOf(']');
      expect(jsonStart).toBeGreaterThanOrEqual(0);
      const parsed = JSON.parse(result.stdout.slice(jsonStart, jsonEnd + 1)) as unknown[];
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
    });

    it('pack metadata --catalog returns only eligible packs', async () => {
      const result = await runForge(['pack', 'metadata', '--catalog'], { env: { FORGE_REPO_ROOT: repoRoot } });
      expect(result.exitCode).toBe(0);
    });

    it('pack list fails gracefully without a catalog (cwd outside repo)', async () => {
      // Run with cwd=/tmp (no catalog walk path) and a bad FORGE_REPO_ROOT
      const result = await runForge(
        ['pack', 'list'],
        { cwd: '/tmp', env: { FORGE_REPO_ROOT: '/tmp/definitely-no-catalog' } },
      );
      expect(result.exitCode).toBe(1);
      expect(result.stdout + result.stderr).toMatch(/not found|FORGE_REPO_ROOT/i);
    });
  });

  // ─── status command ───────────────────────────────────────────────────────
  describe('status command', () => {
    it('status --json returns valid structure', async () => {
      const result = await runForge(['status', '--json']);
      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(result.stdout) as { services: unknown[]; timestamp: string };
      expect(Array.isArray(parsed.services)).toBe(true);
      // All services should have an expected structure
      (parsed.services as Array<{ key: string; state: string; port: number }>).forEach(svc => {
        expect(typeof svc.key).toBe('string');
        expect(['up', 'down', 'crashed']).toContain(svc.state);
        expect(typeof svc.port).toBe('number');
      });
    });

    it('status --clear-locks exits 0', async () => {
      const result = await runForge(['status', '--clear-locks']);
      expect(result.exitCode).toBe(0);
    });
  });

  // ─── help for all commands including previously unregistered ones ─────────
  describe('all commands reachable via --help', () => {
    const allCommands = [
      'status', 'doctor', 'dev', 'docs', 'open', 'pack', 'mcp', 'config',
      'env', 'logs', 'monitor', 'init', 'plugin', 'completion', 'alias',
      'backup', 'upgrade', 'schedule', 'notify', 'workspace', 'interactive', 'remote', 'deploy',
    ];

    allCommands.forEach((cmd) => {
      it(`forge ${cmd} --help exits 0`, async () => {
        const result = await runForge([cmd, '--help']);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(/usage/i);
      });
    });
  });
});
