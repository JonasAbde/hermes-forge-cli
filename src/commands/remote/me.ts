import { Command } from 'commander';
import chalk from 'chalk';
import { ForgeApiClient } from '../../lib/forgeApiClient.js';
import { printHeader, printInfo, printError } from '../../lib/output.js';
import { config } from '../../lib/configManager.js';
const p = new Command('me').description('Show authenticated user profile').option('--json', 'output as JSON')
  .action(async (o) => {
    const cfg = config.get(); const client = new ForgeApiClient({ baseUrl: cfg.remote?.baseUrl, apiKey: cfg.remote?.apiKey });
    try { const user = await client.getProfile(); if (!user) { printError('Not authenticated. Run: forge remote login'); return; }
      if (o.json) { console.log(JSON.stringify(user, null, 2)); return; }
      printHeader('Remote Profile'); printInfo('Email:     ' + user.email); printInfo('Role:      ' + user.role); printInfo('Tier:      ' + user.tier);
      if (user.display_name) printInfo('Name:      ' + user.display_name); printInfo('Joined:    ' + new Date(user.created_at * 1000).toLocaleDateString());
    } catch (err) { printError('Failed: ' + (err instanceof Error ? err.message : String(err))); }
  });
export default p;
