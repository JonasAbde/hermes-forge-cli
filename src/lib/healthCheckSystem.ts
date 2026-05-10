/**
 * forge-health — Health check engine for Forge services.
 *
 * Two execution modes:
 *   1. **Script mode** (default on production VPS): Executes
 *      ~/.hermes/scripts/forge-health.sh --json and parses output.
 *   2. **Fallback mode**: Simple HTTP health checks for common services
 *      when the script is not available (local dev, CI).
 *
 * Output is normalised to a HealthReport structure regardless of mode.
 */

import { execa } from 'execa';
import { existsSync } from 'node:fs';
import { homedir, hostname } from 'node:os';
import { join } from 'node:path';

// ── Types ─────────────────────────────────────────────────────────────────

export interface HealthCheck {
  check: string;
  status: 'ok' | 'warn' | 'critical';
  message: string;
  timestamp: string;
}

export interface HealthReport {
  status: 'OK' | 'WARNINGS' | 'CRITICAL';
  exitCode: 0 | 1 | 2;
  timestamp: string;
  hostname: string;
  mode: 'script' | 'fallback';
  checks: HealthCheck[];
  summary: {
    ok: number;
    warn: number;
    critical: number;
    total: number;
  };
}

// ── Config ────────────────────────────────────────────────────────────────

const DEFAULT_HEALTH_SCRIPT = join(homedir(), '.hermes', 'scripts', 'forge-health.sh');

// Common fallback endpoints to ping when the script is not available
const FALLBACK_ENDPOINTS: Array<{ label: string; url: string; expected: number }> = [
  { label: 'Forge Web', url: 'https://forge.tekup.dk', expected: 200 },
  { label: 'MCP Server', url: 'http://localhost:8641/health', expected: 200 },
  { label: 'API Server', url: 'http://localhost:5181/health', expected: 200 },
];

// ── Helpers ───────────────────────────────────────────────────────────────

function now(): string {
  return new Date().toISOString();
}

function buildSummary(checks: HealthCheck[]): HealthReport['summary'] {
  const ok = checks.filter((c) => c.status === 'ok').length;
  const warn = checks.filter((c) => c.status === 'warn').length;
  const critical = checks.filter((c) => c.status === 'critical').length;
  return { ok, warn, critical, total: checks.length };
}

function statusFromExit(exitCode: number): HealthReport['status'] {
  if (exitCode === 0) return 'OK';
  if (exitCode === 1) return 'WARNINGS';
  return 'CRITICAL';
}

// ── Fallback mode ─────────────────────────────────────────────────────────

async function runFallbackChecks(): Promise<HealthReport> {
  const checks: HealthCheck[] = [];
  const ts = now();

  for (const ep of FALLBACK_ENDPOINTS) {
    try {
      const res = await fetch(ep.url, {
        method: 'GET',
        signal: AbortSignal.timeout(10_000),
      });
      if (res.status === ep.expected) {
        checks.push({
          check: `endpoint:${ep.label}`,
          status: 'ok',
          message: `${ep.label} — HTTP ${res.status} (expected ${ep.expected})`,
          timestamp: ts,
        });
      } else {
        checks.push({
          check: `endpoint:${ep.label}`,
          status: 'critical',
          message: `${ep.label} — HTTP ${res.status} (expected ${ep.expected})`,
          timestamp: ts,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      checks.push({
        check: `endpoint:${ep.label}`,
        status: 'critical',
        message: `${ep.label} — connection failed: ${msg}`,
        timestamp: ts,
      });
    }
  }

  const summary = buildSummary(checks);
  const exitCode: 0 | 1 | 2 = summary.critical > 0 ? 2 : summary.warn > 0 ? 1 : 0;

  return {
    status: statusFromExit(exitCode),
    exitCode,
    timestamp: ts,
    hostname: hostname(),
    mode: 'fallback',
    checks,
    summary,
  };
}

// ── Script mode ───────────────────────────────────────────────────────────

async function runScriptChecks(scriptPath: string): Promise<HealthReport> {
  const ts = now();

  try {
    const { stdout, exitCode } = await execa(scriptPath, ['--json'], {
      timeout: 30_000,
      reject: false,
    });

    if (!stdout) {
      return {
        status: 'CRITICAL',
        exitCode: 2,
        timestamp: ts,
        hostname: hostname(),
        mode: 'script',
        checks: [],
        summary: { ok: 0, warn: 0, critical: 0, total: 0 },
      };
    }

    const parsed = JSON.parse(stdout);
    const checks: HealthCheck[] = Array.isArray(parsed.checks) ? parsed.checks : [];
    const summary = buildSummary(checks);
    const scriptExit = (parsed.exit_code ?? exitCode ?? 0) as number;
    const mappedExit: 0 | 1 | 2 = scriptExit >= 2 ? 2 : scriptExit === 1 ? 1 : 0;

    return {
      status: parsed.status ?? statusFromExit(mappedExit),
      exitCode: mappedExit,
      timestamp: ts,
      hostname: hostname(),
      mode: 'script',
      checks,
      summary,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      status: 'CRITICAL',
      exitCode: 2,
      timestamp: ts,
      hostname: hostname(),
      mode: 'script',
      checks: [
        {
          check: 'script-execution',
          status: 'critical' as const,
          message: `Health script crashed: ${msg}`,
          timestamp: ts,
        },
      ],
      summary: { ok: 0, warn: 0, critical: 1, total: 1 },
    };
  }
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Run a comprehensive health check against Forge services.
 *
 * On production VPS (script exists at default path), executes the full
 * bash health check which covers systemd, endpoints, nginx, disk, memory.
 * Falls back to simple HTTP endpoint pings when the script is unavailable.
 *
 * @param scriptPathOverride — Optional custom path to forge-health.sh
 */
export async function runHealthCheck(
  scriptPathOverride?: string,
): Promise<HealthReport> {
  const scriptPath = scriptPathOverride ?? DEFAULT_HEALTH_SCRIPT;

  if (existsSync(scriptPath)) {
    return runScriptChecks(scriptPath);
  }

  return runFallbackChecks();
}
