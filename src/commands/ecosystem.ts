/**
 * forge ecosystem-status — Show the status of all Forge ecosystem repos.
 *
 * Checks:
 *   - Platform health endpoint
 *   - Latest versions (GitHub + npm registry)
 *   - Open pull requests
 *   - Last commit timestamps
 *
 * Usage:
 *   forge ecosystem-status           # Human-readable table
 *   forge ecosystem-status --json    # Machine-readable JSON
 *
 * Exit codes:
 *   0 — All systems operational
 *   1 — One or more issues detected
 */

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { printHeader, printSuccess, printError, printWarning, printInfo } from '../lib/output.js';

// ── Ecosystem manifest ────────────────────────────────────────────────────

interface RepoInfo {
  name: string;
  displayName: string;
  github: string;
  role: string;
  status: string;
  visibility: string;
  packageName: string;
  version: string;
  deployTarget: string;
}

const REPOS: RepoInfo[] = [
  {
    name: 'hermes-forge-platform',
    displayName: 'Platform',
    github: 'JonasAbde/hermes-forge-platform',
    role: 'Core API & Game Engine',
    status: 'active',
    visibility: 'private',
    packageName: 'hermes-forge-platform',
    version: '5.7.0',
    deployTarget: 'forge.tekup.dk',
  },
  {
    name: 'hermes-forge-cli',
    displayName: 'CLI',
    github: 'JonasAbde/hermes-forge-cli',
    role: 'Developer Tool',
    status: 'active',
    visibility: 'public',
    packageName: '@jonasabde/hermes-forge-cli',
    version: '2.8.0',
    deployTarget: 'npm',
  },
  {
    name: 'hermes-forge-mcp',
    displayName: 'MCP Server',
    github: 'JonasAbde/hermes-forge-mcp',
    role: 'Model Context Protocol',
    status: 'active',
    visibility: 'public',
    packageName: 'forge-mcp',
    version: '2.2.0',
    deployTarget: 'npm',
  },
  {
    name: 'hermes-forge-mobile',
    displayName: 'Mobile',
    github: 'JonasAbde/hermes-forge-mobile',
    role: 'React Native App',
    status: 'beta',
    visibility: 'private',
    packageName: 'hermes-forge-mobile',
    version: '1.1.0',
    deployTarget: 'App Store / Play Store',
  },
];

const PLATFORM_URL = 'https://forge.tekup.dk';
const GH_API = 'https://api.github.com';

// ── Helpers ───────────────────────────────────────────────────────────────

async function fetchJSON(url: string, headers?: Record<string, string>): Promise<any> {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

async function checkPlatformHealth(): Promise<{ ok: boolean; status: number; ms: number }> {
  const start = Date.now();
  try {
    const res = await fetch(`${PLATFORM_URL}/ready`, { signal: AbortSignal.timeout(5000) });
    return { ok: res.ok, status: res.status, ms: Date.now() - start };
  } catch {
    return { ok: false, status: 0, ms: Date.now() - start };
  }
}

async function getNpmVersion(packageName: string): Promise<string | null> {
  try {
    const data = await fetchJSON(`https://registry.npmjs.org/${packageName}/latest`);
    return data.version || null;
  } catch {
    return null;
  }
}

async function getGitHubInfo(repo: string): Promise<{ lastCommit?: string; openPRs?: number; defaultBranch?: string } | null> {
  try {
    const [commits, prs, repoData] = await Promise.allSettled([
      fetchJSON(`${GH_API}/repos/${repo}/commits?per_page=1`),
      fetchJSON(`${GH_API}/repos/${repo}/pulls?state=open&per_page=1`),
      fetchJSON(`${GH_API}/repos/${repo}`),
    ]);

    const result: any = {};
    if (commits.status === 'fulfilled' && commits.value.length > 0) {
      result.lastCommit = commits.value[0].commit.author.date;
    }
    if (prs.status === 'fulfilled') {
      result.openPRs = prs.value.length;
    }
    if (repoData.status === 'fulfilled') {
      result.defaultBranch = repoData.value.default_branch;
    }
    return result;
  } catch {
    return null;
  }
}

function statusBadge(ok: boolean): string {
  return ok ? chalk.green('●') : chalk.red('●');
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Command ───────────────────────────────────────────────────────────────

const cmd = new Command('ecosystem-status')
  .alias('ecosystem')
  .description('Show status of all Forge ecosystem repos')
  .option('--json', 'Output as JSON')
  .action(async (opts: { json?: boolean }) => {
    const startTime = Date.now();

    // Collect all data in parallel
    const platformHealth = checkPlatformHealth();
    const ghInfos = Promise.all(REPOS.map(r => getGitHubInfo(r.github)));
    const npmVersions = Promise.all(REPOS.map(async r => {
      if (r.deployTarget === 'npm') {
        return await getNpmVersion(r.packageName);
      }
      return null;
    }));

    const [health, infos, npms] = await Promise.all([platformHealth, ghInfos, npmVersions]);

    if (opts.json) {
      const result = {
        timestamp: new Date().toISOString(),
        platform: {
          url: PLATFORM_URL,
          healthy: health.ok,
          status: health.status,
          responseMs: health.ms,
        },
        repos: REPOS.map((r, i) => ({
          ...r,
          npmVersion: npms[i],
          lastCommit: infos[i]?.lastCommit || null,
          openPRs: infos[i]?.openPRs || 0,
        })),
      };
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    // ── Render human-readable output ──

    printHeader('Forge Ecosystem Status');

    // Platform health
    console.log(chalk.bold('\n  Platform:'));
    if (health.ok) {
      console.log(`    ${statusBadge(true)} ${chalk.green(PLATFORM_URL)} ${chalk.gray(`/ready → ${health.status} (${health.ms}ms)`)}`);
    } else {
      console.log(`    ${statusBadge(false)} ${chalk.red(PLATFORM_URL)} ${chalk.gray(`/ready → UNREACHABLE`)}`);
    }

    // Repo table
    const table = new Table({
      head: [chalk.cyan('Repo'), chalk.cyan('Version'), chalk.cyan('npm'), chalk.cyan('Last Commit'), chalk.cyan('PRs'), chalk.cyan('Status')],
      colWidths: [16, 12, 14, 16, 6, 10],
      style: { head: [], border: [] },
    });

    let hasIssues = false;

    REPOS.forEach((repo, i) => {
      const npmVer = npms[i];
      const info = infos[i];
      const lastCommit = info?.lastCommit ? timeAgo(info.lastCommit) : '—';
      const openPRs = info?.openPRs ?? 0;
      const npmDisplay = npmVer
        ? (npmVer === repo.version ? chalk.green(npmVer) : chalk.yellow(`${npmVer} ≠ ${repo.version}`))
        : chalk.gray('—');

      // Check for version mismatch
      if (npmVer && npmVer !== repo.version) hasIssues = true;
      if (!health.ok) hasIssues = true;

      table.push([
        repo.displayName,
        `v${repo.version}`,
        npmDisplay,
        lastCommit,
        openPRs > 0 ? chalk.yellow(String(openPRs)) : chalk.green('0'),
        repo.status === 'active' ? chalk.green('active') : chalk.yellow(repo.status),
      ]);
    });

    console.log('\n' + table.toString());

    // Summary
    const elapsed = Date.now() - startTime;
    console.log(`\n  ${chalk.gray(`Checked ${REPOS.length} repos in ${elapsed}ms`)}`);

    if (hasIssues) {
      console.log(`  ${chalk.yellow('⚠ Issues detected — check version mismatches or platform health')}`);
      process.exit(1);
    } else {
      console.log(`  ${chalk.green('✓ All systems operational')}`);
    }
  });

export default cmd;
