import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync, existsSync } from 'fs';
import { printHeader, printSuccess, printError, printInfo, printWarning } from '../../lib/output.js';
import { config } from '../../lib/configManager.js';
import { resolveRepoRoot, catalogJsonPathForRoot } from '../../lib/repoPaths.js';

const BACKEND_SYNC_ENDPOINT = '/api/forge/v1/admin/packs/sync';

const program = new Command('sync')
  .description('Sync local packs catalog with remote forge instance')
  .option('--dry-run', 'show what would be sent without sending')
  .option('--target <url>', 'target Forge instance URL', 'https://forge.tekup.dk')
  .option('--api-key <key>', 'API key for authentication')
  .action(async (o: { dryRun?: boolean; target: string; apiKey?: string }) => {
    printHeader('Pack Sync');
    const { root } = resolveRepoRoot();
    const catalogPath = catalogJsonPathForRoot(root);

    if (!existsSync(catalogPath)) {
      printError('catalog.json not found at ' + catalogPath);
      printInfo('Build a catalog first: forge pack build');
      return;
    }

    const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
    const packs: Array<{ pack_id?: string; name?: string }> = catalog.packs || [];

    if (packs.length === 0) {
      printWarning('No packs found in catalog.json');
      printInfo('Add packs and rebuild: forge pack build');
      return;
    }

    printInfo('Found ' + packs.length + ' packs in catalog');

    // ── Dry-run: show what would sync ──────────────
    if (o.dryRun) {
      printInfo('Packs that would be synced:');
      packs.forEach((pack: { pack_id?: string; name?: string }) => {
        console.log('  ' + chalk.cyan((pack.pack_id || '').padEnd(30)) + ' ' + (pack.name || '(unnamed)'));
      });
      printInfo('Dry-run complete: would sync ' + packs.length + ' packs to ' + o.target);
      return;
    }

    // ── Auth check ──────────────────────────────────
    const cfg = config.get();
    const apiKey = o.apiKey || (cfg.remote ? cfg.remote.apiKey : undefined);
    if (!apiKey) {
      printError('API key required.');
      printInfo('Set it:   forge remote login --api-key <key>');
      printInfo('Or pass:  forge pack sync --api-key <key>');
      return;
    }

    // ── Actual sync ─────────────────────────────────
    printInfo('Syncing ' + packs.length + ' packs to ' + o.target + '...');
    try {
      const fullUrl = o.target.replace(/\/+$/, '') + BACKEND_SYNC_ENDPOINT;
      const res = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ packs }),
      });

      if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + (await res.text()));

      const body = (await res.json()) as { status?: string; synced: number; errors?: string[] };
      const synced = body.synced ?? 0;

      if (synced === packs.length) {
        printSuccess('All ' + synced + ' packs synced successfully');
      } else if (synced > 0) {
        printSuccess('Synced ' + synced + ' of ' + packs.length + ' packs');
      } else {
        printError('No packs were synced.');
      }

      if (body.errors?.length) {
        printWarning(body.errors.length + ' errors during sync:');
        body.errors.forEach((e: string) => printError(e));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED')) {
        printError('Could not reach ' + o.target + '. Is the Forge instance running?');
      } else if (msg.includes('401') || msg.includes('Unauthorized')) {
        printError('Authentication failed. Check your API key.');
      } else if (msg.includes('403') || msg.includes('Forbidden')) {
        printError('Access denied. Your API key does not have admin permissions.');
      } else {
        printError('Sync failed: ' + msg);
      }
    }
  });

export default program;
