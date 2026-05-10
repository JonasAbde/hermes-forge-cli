/**
 * forge health — Run comprehensive health checks against Forge services.
 *
 * Detects the operating environment and runs appropriate checks:
 * - Production VPS: full health script (systemd, endpoints, nginx, disk, memory)
 * - Local/CI: HTTP endpoint pings to common Forge services
 *
 * Usage:
 *   forge health              # Default: human-readable report
 *   forge health --json       # Machine-readable JSON
 *   forge health --watch      # Live-updating dashboard (like top for Forge)
 *   forge health --script <path>  # Use a custom health script path
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { runHealthCheck, type HealthCheck, type HealthReport } from '../lib/healthCheckSystem.js';
import { printHeader, printSuccess, printError, printWarning, printInfo } from '../lib/output.js';

// ── Display ───────────────────────────────────────────────────────────────

function statusIcon(status: HealthCheck['status']): string {
  switch (status) {
    case 'ok': return chalk.green('✓');
    case 'warn': return chalk.yellow('⚠');
    case 'critical': return chalk.red('✗');
  }
}

function statusColor(text: string, status: HealthCheck['status']): string {
  switch (status) {
    case 'ok': return chalk.green(text);
    case 'warn': return chalk.yellow(text);
    case 'critical': return chalk.red(text);
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
  return `${Math.floor(ms / 3_600_000)}h ${Math.floor((ms % 3_600_000) / 60_000)}m`;
}

function renderTerminal(report: HealthReport, startTime: number): void {
  const elapsed = Date.now() - startTime;

  printHeader('Forge Health Check');

  // Meta
  console.log(`  ${chalk.gray('Host:')}      ${report.hostname}`);
  console.log(`  ${chalk.gray('Timestamp:')} ${report.timestamp.replace('T', ' ').replace('Z', '')}`);
  console.log(`  ${chalk.gray('Mode:')}      ${report.mode === 'script' ? 'Full (systemd + endpoints + resources)' : 'Fallback (HTTP pings only)'}`);
  console.log(`  ${chalk.gray('Duration:')}  ${formatDuration(elapsed)}`);
  console.log('');

  // Checks by category
  const categories = new Map<string, HealthCheck[]>();
  for (const check of report.checks) {
    const cat = check.check.startsWith('service:') ? 'Services'
      : check.check.startsWith('timer:') ? 'Timers'
      : check.check.startsWith('endpoint:') ? 'Endpoints'
      : check.check.startsWith('nginx') ? 'Nginx'
      : check.check.startsWith('disk') ? 'Resources'
      : check.check.startsWith('memory') ? 'Resources'
      : check.check.startsWith('github') ? 'Runners'
      : 'Other';
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(check);
  }

  for (const [cat, checks] of Array.from(categories.entries())) {
    console.log(chalk.bold(`  ${cat}:`));
    for (const check of checks) {
      // Extract human-readable label from check name
      const label = check.check.includes(':')
        ? check.check.split(':').slice(1).join(':')
        : check.check;
      console.log(`    ${statusIcon(check.status)} ${colorLabel(check.status, label)}`);
      // For warnings/critical, show the message details
      if (check.status !== 'ok') {
        console.log(`      ${chalk.gray(check.message)}`);
      }
    }
    console.log('');
  }

  // Summary
  const { ok, warn, critical, total } = report.summary;
  const summaryLine = `${ok}/${total} checks passed`;
  const parts: string[] = [chalk.green(`${ok} ok`)];
  if (warn > 0) parts.push(chalk.yellow(`${warn} warn`));
  if (critical > 0) parts.push(chalk.red(`${critical} critical`));

  console.log(chalk.cyan(`  ── Summary: ${parts.join(', ')} ──`));

  if (critical > 0) {
    printError(`  Status: ${report.status} (${critical} critical failure(s))`);
    process.exitCode = 2;
  } else if (warn > 0) {
    printWarning(`  Status: ${report.status} (${warn} warning(s))`);
    process.exitCode = 1;
  } else {
    printSuccess(`  Status: ${report.status} — all ${total} checks passed`);
    process.exitCode = 0;
  }
  console.log('');
}

function colorLabel(status: HealthCheck['status'], label: string): string {
  switch (status) {
    case 'ok': return chalk.white(label);
    case 'warn': return chalk.yellow(label);
    case 'critical': return chalk.red(label);
  }
}

function renderJson(report: HealthReport): void {
  console.log(JSON.stringify(report, null, 2));
}

// ── Watch mode ────────────────────────────────────────────────────────────

async function runWatchMode(intervalMs: number, scriptPath?: string): Promise<void> {
  // Clear screen helper
  const clear = () => process.stdout.write('\x1Bc\x1B[3J');

  // Handle exit
  let running = true;
  const exit = () => {
    if (running) {
      running = false;
      clear();
      console.log(chalk.green('\n✓ Health monitor stopped\n'));
      process.exit(0);
    }
  };
  process.on('SIGINT', exit);
  process.on('SIGTERM', exit);

  // Set up keyboard input
  const stdin = process.stdin;
  if (stdin.isTTY) {
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    stdin.on('data', (key: string) => {
      if (key === 'q' || key === 'Q' || key === '\u0003') exit();
    });
  }

  // Main loop
  while (running) {
    clear();
    const startTime = Date.now();
    const report = await runHealthCheck(scriptPath);
    renderTerminal(report, startTime);

    // Footer
    console.log(chalk.gray(`  Watching every ${intervalMs / 1000}s — press q or Ctrl+C to exit`));
    console.log('');

    // Wait for interval, but allow early exit
    await Promise.race([
      new Promise((resolve) => setTimeout(resolve, intervalMs)),
      new Promise<void>((resolve) => {
        const check = setInterval(() => {
          if (!running) { clearInterval(check); resolve(); }
        }, 100);
      }),
    ]);
  }

  // Cleanup
  if (stdin.isTTY) {
    stdin.setRawMode?.(false);
    stdin.pause();
  }
}

// ── Command definition ───────────────────────────────────────────────────

const program = new Command('health')
  .description('Run comprehensive health checks against Forge services')
  .option('--json', 'output as JSON')
  .option('-w, --watch', 'live-updating dashboard (auto-refresh)')
  .option('-i, --interval <ms>', 'watch refresh interval in milliseconds', '5000')
  .option('--script <path>', 'path to forge-health.sh script (auto-detected)')
  .action(async (options: { json?: boolean; watch?: boolean; interval?: string; script?: string }) => {
    const startTime = Date.now();

    // Watch mode
    if (options.watch) {
      const intervalMs = Math.max(1000, parseInt(options.interval ?? '5000', 10) || 5000);
      await runWatchMode(intervalMs, options.script);
      return;
    }

    // Single-run mode
    const report = await runHealthCheck(options.script);

    if (options.json) {
      renderJson(report);
    } else {
      renderTerminal(report, startTime);
    }

    process.exit(report.exitCode);
  });

export default program;
