import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync, existsSync } from 'fs';
import { printHeader, printSuccess, printError, printInfo } from '../../lib/output.js';
import { config } from '../../lib/configManager.js';
import { resolveRepoRoot, catalogJsonPathForRoot } from '../../lib/repoPaths.js';

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
      return;
    }
    const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
    const packs: Array<{ pack_id?: string; name?: string }> = catalog.packs || [];
    printInfo('Found ' + packs.length + ' packs in catalog');

    if (o.dryRun) {
      packs.forEach((pack: { pack_id?: string; name?: string }) => {
        console.log('  ' + chalk.cyan((pack.pack_id || '').padEnd(30)) + ' ' + (pack.name || '(unnamed)'));
      });
      printInfo('Dry-run: would sync ' + packs.length + ' packs to ' + o.target);
      return;
    }

    const cfg = config.get();
    const apiKey = o.apiKey || (cfg.remote ? cfg.remote.apiKey : undefined);
    if (!apiKey) {
      printError('API key required. Use --api-key <key> or run: forge remote login --api-key <key>');
      return;
    }

    printInfo('Syncing packs...');
    try {
      const res = await fetch(o.target + '/api/forge/v1/admin/packs/sync', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ packs }),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + (await res.text()));
      const result = (await res.json()) as { synced: number; errors?: string[] };
      printSuccess('Synced ' + result.synced + ' packs');
      if (result.errors?.length) {
        result.errors.forEach((e: string) => printError(e));
      }
    } catch (err) {
      printError('Sync failed: ' + (err instanceof Error ? err.message : String(err)));
    }
  });

export default program;
