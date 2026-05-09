import { Command } from 'commander';
import chalk from 'chalk';
import { ForgeApiClient } from '../lib/forgeApiClient.js';
import { printHeader, printSuccess, printError, printInfo } from '../lib/output.js';
import { config } from '../lib/configManager.js';
import Table from 'cli-table3';

const p = new Command('deploy').description('Manage agent deployments on forge.tekup.dk');

const listCmd = new Command('list').description('List all deployments').option('--json', 'output as JSON')
  .action(async (o) => {
    const cfg = config.get();
    const client = new ForgeApiClient({ baseUrl: cfg.remote?.baseUrl, apiKey: cfg.remote?.apiKey });
    try {
      const deps = await client.listDeployments();
      if (o.json) { console.log(JSON.stringify(deps, null, 2)); return; }
      printHeader('Deployments (' + deps.length + ')');
      const table = new Table({ head: [chalk.bold('Name'), chalk.bold('Status'), chalk.bold('Ver'), chalk.bold('Packs')], colWidths: [22, 12, 6, 34], style: { head: ['cyan'] } });
      deps.forEach((d: any) => { const c = d.status === 'running' ? chalk.green : d.status === 'error' ? chalk.red : chalk.gray; table.push([d.name, c(d.status), String(d.version), (d.pack_ids || []).join(', ').slice(0, 32)]); });
      console.log(table.toString());
    } catch (err) { printError('Failed: ' + (err instanceof Error ? err.message : String(err))); }
  });

const createCmd = new Command('create').description('Create a new deployment').argument('<name>').argument('<pack-ids...>')
  .action(async (name: string, packIds: string[]) => {
    const cfg = config.get(); const client = new ForgeApiClient({ baseUrl: cfg.remote?.baseUrl, apiKey: cfg.remote?.apiKey });
    try { printInfo('Deploying ' + packIds.length + ' pack(s) as "' + name + '"...'); const d = await client.createDeployment(name, packIds); printSuccess('Deployment created: ' + d.id + ' (v' + d.version + ')'); }
    catch (err) { printError('Failed: ' + (err instanceof Error ? err.message : String(err))); }
  });

const startCmd = new Command('start').description('Start a deployment').argument('<id>')
  .action(async (id: string) => { const cfg = config.get(); const client = new ForgeApiClient({ baseUrl: cfg.remote?.baseUrl, apiKey: cfg.remote?.apiKey }); try { await client.startDeployment(id); printSuccess('Deployment ' + id + ' started'); } catch (err) { printError('Failed: ' + (err instanceof Error ? err.message : String(err))); } });
const stopCmd = new Command('stop').description('Stop a deployment').argument('<id>')
  .action(async (id: string) => { const cfg = config.get(); const client = new ForgeApiClient({ baseUrl: cfg.remote?.baseUrl, apiKey: cfg.remote?.apiKey }); try { await client.stopDeployment(id); printSuccess('Deployment ' + id + ' stopped'); } catch (err) { printError('Failed: ' + (err instanceof Error ? err.message : String(err))); } });
const deleteCmd = new Command('delete').description('Delete a deployment').argument('<id>')
  .action(async (id: string) => { const cfg = config.get(); const client = new ForgeApiClient({ baseUrl: cfg.remote?.baseUrl, apiKey: cfg.remote?.apiKey }); try { await client.deleteDeployment(id); printSuccess('Deployment ' + id + ' deleted'); } catch (err) { printError('Failed: ' + (err instanceof Error ? err.message : String(err))); } });

p.addCommand(listCmd).addCommand(createCmd).addCommand(startCmd).addCommand(stopCmd).addCommand(deleteCmd);
export default p;
