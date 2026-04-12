import { Command } from 'commander';
import { readFileSync, existsSync } from 'fs';
import Table from 'cli-table3';
import chalk from 'chalk';
import { printHeader, printError, printInfo } from '../../lib/output.js';
import { resolveRepoRoot, catalogJsonPathForRoot } from '../../lib/repoPaths.js';
/** Statuses considered catalog-eligible (mirrors forge-api-core.mjs). */
const CATALOG_ELIGIBLE_STATUS = new Set([
    'published', 'publish', 'deployed', 'verified', 'rarity_update',
]);
const program = new Command('list')
    .description('List packs from catalog.json')
    .option('--catalog', 'Only show catalog-eligible packs (public + published/deployed)')
    .option('--theme <theme>', 'Filter by card_theme (case-insensitive)')
    .option('--json', 'Output as JSON')
    .action((options) => {
    printHeader('Pack List');
    const { root, source } = resolveRepoRoot();
    const catalogPath = catalogJsonPathForRoot(root);
    if (!existsSync(catalogPath)) {
        printError(`catalog.json not found. Searched from: ${process.cwd()} (source: ${source})`);
        printInfo('Set FORGE_REPO_ROOT or run from the repo root.');
        process.exit(1);
    }
    try {
        const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
        let packs = catalog.packs || [];
        if (options.catalog) {
            packs = packs.filter((p) => p.visibility === 'public' && CATALOG_ELIGIBLE_STATUS.has(p.status ?? ''));
        }
        if (options.theme) {
            const needle = options.theme.toLowerCase();
            packs = packs.filter((p) => (p.card_theme ?? '').toLowerCase() === needle);
        }
        if (options.json) {
            console.log(JSON.stringify(packs, null, 2));
            return;
        }
        const table = new Table({
            head: [
                chalk.bold('ID'),
                chalk.bold('Name'),
                chalk.bold('Theme'),
                chalk.bold('Status'),
                chalk.bold('Trust'),
                chalk.bold('Verified'),
            ],
            colWidths: [32, 22, 14, 14, 7, 10],
        });
        packs.forEach((pack) => {
            const verified = pack.verification_state === 'verified'
                ? chalk.green('✓')
                : chalk.gray('—');
            table.push([
                chalk.cyan(pack.pack_id),
                pack.card_name || pack.name || '—',
                pack.card_theme || '—',
                pack.status || '—',
                pack.trust_score != null ? String(pack.trust_score) : '—',
                verified,
            ]);
        });
        console.log(table.toString());
        printInfo(`\nTotal: ${packs.length} pack(s) | catalog path: ${catalogPath}`);
    }
    catch (err) {
        printError(`Failed to load catalog: ${err.message}`);
        process.exit(1);
    }
});
export default program;
//# sourceMappingURL=list.js.map