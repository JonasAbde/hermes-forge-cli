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
      printInfo('To actually sync, run without --dry-run');

      // Note about missing backend endpoint
      printWarning('Backend note: The sync endpoint (' + BACKEND_SYNC_ENDPOINT + ')');
      printWarning('is not yet deployed on the server. Actual sync will fail until deployed.');
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

      if (res.status === 404) {
        printError('Sync endpoint not found on server (HTTP 404).');
        printWarning('The backend endpoint ' + BACKEND_SYNC_ENDPOINT + ' has not been deployed yet.');
        printInfo('To implement the backend endpoint, see: docs/CLI_PACK_SYNC_CONTRACT.md');
        printInfo('Expected API contract:');
        printInfo('  POST ' + fullUrl);
        printInfo('  Body: { packs: Array<{ pack_id, name, ... }> }');
        printInfo('  Response: { synced: number, errors?: string[] }');
        return;
      }

      if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + (await res.text()));

      const result = (await res.json()) as { synced: number; errors?: string[] };
      printSuccess('Synced ' + result.synced + ' packs successfully');

      if (result.errors?.length) {
        printWarning(result.errors.length + ' errors during sync:');
        result.errors.forEach((e: string) => printError(e));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED')) {
        printError('Could not reach ' + o.target + '. Is the Forge instance running?');
      } else if (msg.includes('401') || msg.includes('Unauthorized')) {
        printError('Authentication failed. Check your API key.');
      } else {
        printError('Sync failed: ' + msg);
      }
    }
  });

export default program;
