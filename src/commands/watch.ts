/**
 * forge watch — Subscribe to events and monitor changes
 *
 * Watches for changes on the Forge platform and notifies the user.
 * Supports polling-based watching for events like deployments,
 * gameplay, marketplace, and system health.
 *
 * Usage:
 *   forge watch                  — List active watches
 *   forge watch add <event>      — Add a new watch (deploy, market, health, gameplay)
 *   forge watch remove <id>      — Remove a watch by ID
 *   forge watch poll             — Run all watches once and report
 *   forge watch start [--interval <sec>] — Start continuous polling (daemon)
 */

import { Command } from 'commander';
import chalk from 'chalk';
import Conf from 'conf';
import { config } from '../lib/configManager.js';

// ─── Types ───────────────────────────────────────────────────────

interface WatchEntry {
  id: string;
  event: string;
  label: string;
  created: string;
  lastCheck: string | null;
  lastResult: string | null;
}

interface WatchState {
  watches: WatchEntry[];
}

// ─── Store ───────────────────────────────────────────────────────

const _store = new Conf<WatchState>({
  projectName: 'forge-cli-watch',
  defaults: { watches: [] },
});

function getWatches(): WatchEntry[] {
  return _store.get('watches');
}

function setWatches(w: WatchEntry[]): void {
  _store.set('watches', w);
}

function nextId(): string {
  const existing = getWatches();
  return `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

// ─── Event Defs ──────────────────────────────────────────────────

const EVENT_DEFS: Record<string, { label: string; description: string; endpoint: string }> = {
  deploy: {
    label: 'Deployments',
    description: 'Monitor deployment status changes',
    endpoint: '/agents/deployments',
  },
  market: {
    label: 'Marketplace',
    description: 'Watch for new listings and price changes',
    endpoint: '../market/packs',
  },
  health: {
    label: 'System Health',
    description: 'Monitor forge API health status',
    endpoint: '/health',
  },
  gameplay: {
    label: 'Gameplay',
    description: 'Track pack openings and agent changes',
    endpoint: '/me/profile',
  },
};

const VALID_EVENTS = Object.keys(EVENT_DEFS);

// ─── API Check ───────────────────────────────────────────────────

async function checkEvent(event: string): Promise<{ changed: boolean; summary: string }> {
  const def = EVENT_DEFS[event];
  if (!def) return { changed: false, summary: 'Unknown event' };

  const baseUrl = config.get().remote?.baseUrl || 'https://forge.tekup.dk/api/forge/v1';
  const apiKey = config.get().remote?.apiKey;

  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const url = `${baseUrl.replace(/\/+$/, '')}/${def.endpoint.replace(/^\//, '')}`;
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });

    if (!res.ok) {
      return { changed: false, summary: `HTTP ${res.status} — ${res.statusText}` };
    }

    const body = await res.json();

    // Generate a summary based on event type
    let summary = '';
    if (event === 'deploy') {
      const deploys = Array.isArray(body) ? body : body.deployments || [];
      summary = `${deploys.length} deployment(s)`;
    } else if (event === 'market') {
      const packs = Array.isArray(body) ? body : body.packs || [];
      summary = `${packs.length} pack(s) listed`;
    } else if (event === 'health') {
      summary = body.status === 'ok' ? 'Healthy' : `Status: ${body.status || 'unknown'}`;
    } else if (event === 'gameplay') {
      const agents = body.agents || body.user?.agents || [];
      summary = `${agents.length} agent(s)`;
    }

    return { changed: true, summary };
  } catch (err: any) {
    return { changed: false, summary: `Error: ${err.message || err}` };
  }
}

// ─── Render ──────────────────────────────────────────────────────

function renderTable(watches: WatchEntry[]): string {
  if (watches.length === 0) return '  No active watches.';

  const rows = watches.map(w => {
    const eventLabel = EVENT_DEFS[w.event]?.label || w.event;
    const status = w.lastResult ? (w.lastResult.includes('Error') ? chalk.red('⚠') : chalk.green('✓')) : chalk.gray('–');
    return `  ${chalk.cyan(w.id.padEnd(8))} ${status} ${chalk.bold(eventLabel.padEnd(14))} ${chalk.dim(w.label)}`;
  });
  return rows.join('\n');
}

// ─── Command ─────────────────────────────────────────────────────

export default new Command('watch')
  .description('Subscribe to Forge events and monitor changes')
  .addCommand(
    new Command('list')
      .description('List active watches')
      .option('-j, --json', 'Output as JSON')
      .action((opts: { json?: boolean }) => {
        const watches = getWatches();
        if (opts.json) {
          console.log(JSON.stringify({ watches }));
          return;
        }
        console.log();
        console.log(`  ${chalk.bold('Active Watches')}`);
        console.log(`  ${chalk.dim('ID       Status  Event           Description')}`);
        console.log(renderTable(watches));
        console.log();
        if (watches.length === 0) {
          console.log(chalk.dim('  Add a watch: forge watch add <event>'));
          console.log(chalk.dim(`  Events: ${VALID_EVENTS.join(', ')}`));
          console.log();
        }
      }),
  )
  .addCommand(
    new Command('add')
      .description('Add a new watch')
      .argument('<event>', `Event type: ${VALID_EVENTS.join(', ')}`)
      .argument('[label]', 'Optional label for this watch')
      .option('-j, --json', 'Output as JSON')
      .action((event: string, label: string | undefined, opts: { json?: boolean }) => {
        if (!VALID_EVENTS.includes(event)) {
          console.error(chalk.red(`✗ Unknown event: ${event}. Valid: ${VALID_EVENTS.join(', ')}`));
          process.exit(1);
        }

        const entry: WatchEntry = {
          id: nextId(),
          event,
          label: label || EVENT_DEFS[event].description,
          created: new Date().toISOString(),
          lastCheck: null,
          lastResult: null,
        };

        const watches = getWatches();
        watches.push(entry);
        setWatches(watches);

        if (opts.json) {
          console.log(JSON.stringify({ watch: entry }));
          return;
        }

        console.log(chalk.green(`✓ Watch added: ${chalk.bold(entry.id)} — ${EVENT_DEFS[event].label}`));
      }),
  )
  .addCommand(
    new Command('remove')
      .alias('rm')
      .description('Remove a watch by ID')
      .argument('<id>', 'Watch ID to remove')
      .option('-j, --json', 'Output as JSON')
      .action((id: string, opts: { json?: boolean }) => {
        const watches = getWatches();
        const idx = watches.findIndex(w => w.id === id);
        if (idx === -1) {
          console.error(chalk.red(`✗ Watch not found: ${id}`));
          process.exit(1);
        }
        const removed = watches.splice(idx, 1)[0];
        setWatches(watches);

        if (opts.json) {
          console.log(JSON.stringify({ removed: removed.id }));
          return;
        }
        console.log(chalk.green(`✓ Watch removed: ${chalk.bold(removed.id)}`));
      }),
  )
  .addCommand(
    new Command('poll')
      .description('Run all watches once and report results')
      .option('-j, --json', 'Output as JSON')
      .action(async (opts: { json?: boolean }) => {
        const watches = getWatches();
        if (watches.length === 0) {
          if (opts.json) {
            console.log(JSON.stringify({ results: [] }));
            return;
          }
          console.log(chalk.dim('No active watches. Add one: forge watch add <event>'));
          return;
        }

        const results: Array<{ id: string; event: string; changed: boolean; summary: string }> = [];
        for (const w of watches) {
          const result = await checkEvent(w.event);
          results.push({ id: w.id, event: w.event, ...result });

          // Update store
          w.lastCheck = new Date().toISOString();
          w.lastResult = result.summary;
        }
        setWatches(watches);

        if (opts.json) {
          console.log(JSON.stringify({ results }));
          return;
        }

        console.log();
        console.log(`  ${chalk.bold('Watch Results')}`);
        for (const r of results) {
          const icon = r.changed ? chalk.green('✓') : chalk.yellow('~');
          const label = EVENT_DEFS[r.event]?.label || r.event;
          console.log(`  ${icon} ${chalk.cyan(r.id.padEnd(8))} ${chalk.bold(label.padEnd(14))} ${chalk.dim(r.summary)}`);
        }
        console.log();
        console.log(chalk.dim('  Continuous polling: forge watch start [--interval 60]'));
        console.log();
      }),
  )
  .addCommand(
    new Command('start')
      .description('Start continuous polling (keeps running)')
      .option('-i, --interval <sec>', 'Poll interval in seconds', '60')
      .action(async (opts: { interval?: string }) => {
        const intervalSec = parseInt(opts.interval || '60', 10);
        if (isNaN(intervalSec) || intervalSec < 5) {
          console.error(chalk.red('✗ Interval must be ≥ 5 seconds'));
          process.exit(1);
        }

        const watches = getWatches();
        if (watches.length === 0) {
          console.log(chalk.yellow('No active watches. Add one first: forge watch add <event>'));
          return;
        }

        console.log(chalk.bold(`\n  🔍 Watching ${watches.length} event(s) — every ${intervalSec}s`));
        console.log(chalk.dim('  Press Ctrl+C to stop\n'));

        const poll = async () => {
          for (const w of watches) {
            const result = await checkEvent(w.event);
            const label = EVENT_DEFS[w.event]?.label || w.event;
            const ts = new Date().toLocaleTimeString();
            const icon = result.changed ? chalk.green('✓') : chalk.gray('~');

            w.lastCheck = new Date().toISOString();
            w.lastResult = result.summary;
            console.log(`  [${chalk.dim(ts)}] ${icon} ${chalk.cyan(w.id)} ${chalk.bold(label)} — ${chalk.dim(result.summary)}`);
          }
          setWatches(watches);
        };

        // Run once immediately, then on interval
        await poll();
        setInterval(poll, intervalSec * 1000);
      }),
  )
  // Default: list watches
  .action((opts: { json?: boolean }) => {
    const watches = getWatches();
    if (opts?.json) {
      console.log(JSON.stringify({ watches }));
      return;
    }
    console.log();
    console.log(`  ${chalk.bold('Active Watches')}`);
    console.log(renderTable(watches));
    console.log();
    if (watches.length === 0) {
      console.log(chalk.dim('  Add a watch: forge watch add <event>'));
      console.log(chalk.dim(`  Events: ${VALID_EVENTS.join(', ')}`));
    } else {
      console.log(chalk.dim('  Poll now: forge watch poll'));
      console.log(chalk.dim('  Continuous: forge watch start --interval 60'));
    }
    console.log();
  });
