import { Command } from 'commander';
import chalk from 'chalk';
import { ForgeApiClient } from '../../lib/forgeApiClient.js';
import { printHeader, printError } from '../../lib/output.js';
import { config } from '../../lib/configManager.js';
import Table from 'cli-table3';
const p = new Command('packs')
  .description('List packs from remote forge.tekup.dk')
  .option('--json', 'output as JSON')
  .action(async (o) => {
    const cfg = config.get();
    const client = new ForgeApiClient({ baseUrl: cfg.remote?.baseUrl, apiKey: cfg.remote?.apiKey });
    try {
      const packs = await client.listPacks();
      if (o.json) { console.log(JSON.stringify(packs, null, 2)); return; }
      printHeader('Remote Packs (' + packs.length + ')');
      const table = new Table({ head: [chalk.bold('Name'), chalk.bold('Status'), chalk.bold('Rarity'), chalk.bold('Trust')], colWidths: [30, 12, 14, 8], style: { head: ['cyan'] } });
      packs.forEach((p) => { table.push([p.name, p.status, p.rarity_label || '-', p.trust_score != null ? String(p.trust_score) : '-']); });
      console.log(table.toString());
    } catch (err) { printError('Failed: ' + (err instanceof Error ? err.message : String(err))); }
  });
export default p;
