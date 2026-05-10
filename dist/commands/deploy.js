import { Command } from 'commander';
import chalk from 'chalk';
import { execa } from 'execa';
import { ForgeApiClient } from '../lib/forgeApiClient.js';
import { printHeader, printSuccess, printError, printInfo } from '../lib/output.js';
import { config } from '../lib/configManager.js';
import { detectEnvironment } from '../lib/envDetector.js';
import Table from 'cli-table3';
const p = new Command('deploy').description('Manage agent & infra deployments');
const listCmd = new Command('list').description('List all deployments').option('--json', 'output as JSON')
    .action(async (o) => {
    const cfg = config.get();
    const client = new ForgeApiClient({ baseUrl: cfg.remote?.baseUrl, apiKey: cfg.remote?.apiKey });
    try {
        const deps = await client.listDeployments();
        if (o.json) {
            console.log(JSON.stringify(deps, null, 2));
            return;
        }
        printHeader('Deployments (' + deps.length + ')');
        if (deps.length === 0) {
            printInfo('No deployments found. Create one with: forge deploy create <name> <pack-ids...>');
            return;
        }
        const table = new Table({ head: [chalk.bold('Name'), chalk.bold('Status'), chalk.bold('Ver'), chalk.bold('Packs')], colWidths: [22, 12, 6, 34], style: { head: ['cyan'] } });
        deps.forEach((d) => { const c = d.status === 'running' ? chalk.green : d.status === 'error' ? chalk.red : chalk.gray; table.push([d.name, c(d.status), String(d.version), (d.pack_ids || []).join(', ').slice(0, 32)]); });
        console.log(table.toString());
    }
    catch (err) {
        printError('Failed: ' + (err instanceof Error ? err.message : String(err)));
    }
});
const createCmd = new Command('create').description('Create a new deployment').argument('<name>').argument('<pack-ids...>')
    .action(async (name, packIds) => {
    const cfg = config.get();
    const client = new ForgeApiClient({ baseUrl: cfg.remote?.baseUrl, apiKey: cfg.remote?.apiKey });
    try {
        printInfo('Deploying ' + packIds.length + ' pack(s) as "' + name + '"...');
        const d = await client.createDeployment(name, packIds);
        printSuccess('Deployment created: ' + d.id + ' (v' + d.version + ')');
    }
    catch (err) {
        printError('Failed: ' + (err instanceof Error ? err.message : String(err)));
    }
});
const startCmd = new Command('start').description('Start a deployment').argument('<id>')
    .action(async (id) => { const cfg = config.get(); const client = new ForgeApiClient({ baseUrl: cfg.remote?.baseUrl, apiKey: cfg.remote?.apiKey }); try {
    await client.startDeployment(id);
    printSuccess('Deployment ' + id + ' started');
}
catch (err) {
    printError('Failed: ' + (err instanceof Error ? err.message : String(err)));
} });
const stopCmd = new Command('stop').description('Stop a deployment').argument('<id>')
    .action(async (id) => { const cfg = config.get(); const client = new ForgeApiClient({ baseUrl: cfg.remote?.baseUrl, apiKey: cfg.remote?.apiKey }); try {
    await client.stopDeployment(id);
    printSuccess('Deployment ' + id + ' stopped');
}
catch (err) {
    printError('Failed: ' + (err instanceof Error ? err.message : String(err)));
} });
const deleteCmd = new Command('delete').description('Delete a deployment').argument('<id>')
    .action(async (id) => { const cfg = config.get(); const client = new ForgeApiClient({ baseUrl: cfg.remote?.baseUrl, apiKey: cfg.remote?.apiKey }); try {
    await client.deleteDeployment(id);
    printSuccess('Deployment ' + id + ' deleted');
}
catch (err) {
    printError('Failed: ' + (err instanceof Error ? err.message : String(err)));
} });
// ── Infra subcommand ──────────────────────────────────────────
const INFRA_TARGETS = ['platform', 'mcp'];
const infraCmd = new Command('infra').description('Deploy Forge platform or MCP server infrastructure').argument('<target>', `deployment target: ${INFRA_TARGETS.join(' | ')}`)
    .option('--json', 'output as JSON')
    .action(async (target, opts) => {
    if (!INFRA_TARGETS.includes(target)) {
        printError(`Unknown target "${target}". Valid targets: ${INFRA_TARGETS.join(', ')}`);
        if (opts.json)
            console.log(JSON.stringify({ success: false, error: `Unknown target "${target}"` }));
        process.exit(1);
    }
    const env = await detectEnvironment();
    if (env.environment !== 'production') {
        const msg = `Not in production environment (detected: ${env.environment}). Infra deploy requires a production forge server.`;
        printError(msg);
        if (opts.json)
            console.log(JSON.stringify({ success: false, error: msg }));
        process.exit(1);
    }
    const steps = [];
    if (target === 'platform') {
        printHeader('Deploying Forge Platform');
        steps.push({ label: 'Building platform', cmd: ['npm', 'run', 'build'], cwd: '/home/ubuntu/projects/hermes-forge-platform' }, { label: 'Rsyncing web dist', cmd: ['rsync', '-a', 'web/dist/', '/var/www/hermes-forge/'], cwd: '/home/ubuntu/projects/hermes-forge-platform' }, { label: 'Testing nginx config', cmd: ['nginx', '-t'] }, { label: 'Reloading nginx', cmd: ['systemctl', 'reload', 'nginx'] });
    }
    else {
        printHeader('Deploying Forge MCP');
        steps.push({ label: 'Building MCP server', cmd: ['npm', 'run', 'build'], cwd: '/home/ubuntu/projects/hermes-forge-mcp' }, { label: 'Restarting MCP service', cmd: ['systemctl', 'restart', 'hermes-forge-mcp'] });
    }
    const results = [];
    for (const step of steps) {
        printInfo(step.label + '...');
        try {
            const { stdout, stderr } = await execa(step.cmd[0], step.cmd.slice(1), { cwd: step.cwd, reject: true });
            const output = (stdout + stderr).trim();
            printSuccess(step.label + ' — OK');
            results.push({ step: step.label, ok: true, output: output.length ? output : undefined });
        }
        catch (err) {
            const msg = err?.stderr || err?.message || String(err);
            printError(step.label + ' — FAILED');
            printError(msg);
            results.push({ step: step.label, ok: false, output: msg });
            if (opts.json)
                console.log(JSON.stringify({ success: false, results }));
            process.exit(1);
        }
    }
    printSuccess(`Forge ${target} deployed successfully`);
    if (opts.json)
        console.log(JSON.stringify({ success: true, target, results }));
});
p.addCommand(listCmd).addCommand(createCmd).addCommand(startCmd).addCommand(stopCmd).addCommand(deleteCmd).addCommand(infraCmd);
export default p;
//# sourceMappingURL=deploy.js.map