import { execa } from 'execa';
import { hostname } from 'node:os';
import { access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

export type ForgeEnvironment = 'production' | 'development' | 'unknown';

export interface EnvInfo {
  environment: ForgeEnvironment;
  hasSystemd: boolean;
  hasForgeServices: boolean;
  hasJournald: boolean;
  hasHealthScript: boolean;
  hostname: string;
}

// ── Singleton cache ────────────────────────────────────────────
let cachedInfo: EnvInfo | null = null;

// ── Helpers ─────────────────────────────────────────────────────

/** Check if a command exists on the system path via `which` or `command -v`. */
async function commandExists(cmd: string): Promise<boolean> {
  try {
    await execa('command', ['-v', cmd], { reject: false });
    return true;
  } catch {
    return false;
  }
}

/** Check if systemd is available by looking for `systemctl`. */
async function checkHasSystemd(): Promise<boolean> {
  return commandExists('systemctl');
}

/** Check if any forge service unit is registered with systemd. */
async function checkHasForgeServices(): Promise<boolean> {
  try {
    const { stdout } = await execa(
      'systemctl',
      ['list-units', '--type=service', '--no-pager', '--no-legend'],
      { reject: false },
    );
    return stdout.split('\n').some(line => line.includes('forge'));
  } catch {
    return false;
  }
}

/** Check if `journalctl` is available on the system. */
async function checkHasJournald(): Promise<boolean> {
  return commandExists('journalctl');
}

/** Check if the forge health script exists at ~/.hermes/scripts/forge-health.sh. */
async function checkHasHealthScript(): Promise<boolean> {
  const scriptPath = join(homedir(), '.hermes', 'scripts', 'forge-health.sh');
  try {
    await access(scriptPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Detect which environment the CLI is running in.
 *
 * - **Production** — systemd is available AND forge services are registered
 * - **Development** — everything else (no systemd, or systemd present but no forge units)
 * - **Unknown** — only returned if detection itself fails unexpectedly
 *
 * Result is cached for the lifetime of the process.
 */
export async function detectEnvironment(): Promise<EnvInfo> {
  if (cachedInfo) {
    return cachedInfo;
  }

  const [hasSystemd, hasForgeServices, hasJournald, hasHealthScript] =
    await Promise.all([
      checkHasSystemd(),
      checkHasForgeServices(),
      checkHasJournald(),
      checkHasHealthScript(),
    ]);

  let environment: ForgeEnvironment;
  if (hasSystemd && hasForgeServices) {
    environment = 'production';
  } else {
    environment = 'development';
  }

  cachedInfo = {
    environment,
    hasSystemd,
    hasForgeServices,
    hasJournald,
    hasHealthScript,
    hostname: hostname(),
  };

  return cachedInfo;
}

/**
 * Convenience shortcut. Returns `true` when `detectEnvironment()` reports
 * `'production'`.
 */
export async function isProduction(): Promise<boolean> {
  const info = await detectEnvironment();
  return info.environment === 'production';
}
