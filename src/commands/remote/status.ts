import { Command } from 'commander';
import chalk from 'chalk';
import { ForgeApiClient } from '../../lib/forgeApiClient.js';
import { printHeader, printSuccess, printError, printInfo } from '../../lib/output.js';
import { config } from '../../lib/configManager.js';
const p = new Command('status')
  .description('Show remote forge.tekup.dk status')
  .option('--json', 'output as JSON')
  .action(async (o) => {
    const cfg = config.get();
    const base = cfg.remote?.baseUrl || 'https://forge.tekup.dk';
    const client = new ForgeApiClient({ baseUrl: base, apiKey: cfg.remote?.apiKey });
    printHeader('Remote Forge \u2014 ' + base);
    try {
      const health = await client.checkHealth();
      const user = await client.getProfile();
      if (o.json) { console.log(JSON.stringify({ health, authenticated: !!user, user, base }, null, 2)); return; }
      if (health) { printSuccess('Status: ' + (health.status || 'ok')); if (health.forge_db) printInfo('DB: ' + health.forge_db); if (health.catalog) printInfo('Catalog: ' + health.catalog); }
      else { printError('Could not reach forge.tekup.dk'); }
      if (user) { printInfo('Authenticated as: ' + chalk.bold(user.email) + ' (' + user.role + ', ' + user.tier + ')'); }
      else { printInfo('Not authenticated. Run: forge remote login'); }
    } catch (err) { printError('Connection failed: ' + (err instanceof Error ? err.message : String(err))); }
  });
export default p;
