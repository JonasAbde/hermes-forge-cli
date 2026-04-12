import { Command } from 'commander';
import { readFileSync, existsSync } from 'fs';
import Table from 'cli-table3';
import chalk from 'chalk';
import { printHeader } from '../../lib/output.js';

const program = new Command('list')
  .description('List packs from catalog.json')
  .option('--catalog', 'Only show catalog-eligible packs')
  .option('--theme <theme>', 'Filter by theme')
  .option('--json', 'Output as JSON')
  .action((options) => {
    printHeader('Pack List');

    const catalogPath = 'server/data/catalog.json';
    if (!existsSync(catalogPath)) {
      console.error('catalog.json not found at server/data/catalog.json');
      process.exit(1);
    }

    try {
      const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
      let packs = catalog.packs || [];

      if (options.catalog) {
        packs = packs.filter((p: any) => p.visibility === 'public' && p.status === 'published');
      }

      if (options.theme) {
        packs = packs.filter((p: any) => 
          p.card_theme?.toLowerCase() === options.theme.toLowerCase()
        );
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
          chalk.bold('Visibility')
        ],
        colWidths: [18, 25, 12, 12, 12]
      });

      packs.forEach((pack: any) => {
        table.push([
          pack.pack_id,
          pack.name || pack.card_name || '—',
          pack.card_theme || '—',
          pack.status || '—',
          pack.visibility || 'private'
        ]);
      });

      console.log(table.toString());
      console.log(`\nTotal: ${packs.length} packs`);
    } catch (error: any) {
      console.error('Failed to load catalog:', error.message);
      process.exit(1);
    }
  });

export default program;
