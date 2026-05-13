#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'node:fs';
import { printHeader } from './lib/output.js';
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const program = new Command();
program.name('forge').description('Forge CLI — unified development, pack management, and MCP tools').version(pkg.version).option('--verbose', 'enable verbose output').showHelpAfterError();
import statusCommand from './commands/status.js';
import doctorCommand from './commands/doctor.js';
import devCommand from './commands/dev.js';
import docsCommand from './commands/docs.js';
import openCommand from './commands/open.js';
import packCommand from './commands/pack/index.js';
import mcpCommand from './commands/mcp/index.js';
import configCommand from './commands/config.js';
import envCommand from './commands/env.js';
import logsCommand from './commands/logs.js';
import monitorCommand from './commands/monitor.js';
import initCommand from './commands/init.js';
import pluginCommand from './commands/plugin.js';
import completionCommand from './commands/completion.js';
import aliasCommand from './commands/alias.js';
import backupCommand from './commands/backup.js';
import upgradeCommand from './commands/upgrade.js';
import scheduleCommand from './commands/schedule.js';
import notifyCommand from './commands/notify.js';
import workspaceCommand from './commands/workspace.js';
import interactiveCommand from './commands/interactive.js';
import remoteCommand from './commands/remote/index.js';
import deployCommand from './commands/deploy.js';
import healthCommand from './commands/health.js';
import tuiCommand from './commands/tui.js';
import { ensureExtensionDirs, injectExtensionCommands } from './lib/extensionManager.js';
// Load extensions before registering built-in commands
ensureExtensionDirs();
program.addCommand(statusCommand).addCommand(doctorCommand).addCommand(devCommand).addCommand(docsCommand).addCommand(openCommand).addCommand(packCommand).addCommand(mcpCommand).addCommand(configCommand).addCommand(envCommand).addCommand(logsCommand).addCommand(monitorCommand).addCommand(initCommand).addCommand(pluginCommand).addCommand(completionCommand).addCommand(aliasCommand).addCommand(backupCommand).addCommand(upgradeCommand).addCommand(scheduleCommand).addCommand(notifyCommand).addCommand(workspaceCommand).addCommand(interactiveCommand).addCommand(remoteCommand).addCommand(deployCommand).addCommand(healthCommand).addCommand(tuiCommand);
// Inject extension commands (can't override built-ins)
injectExtensionCommands(program);
program
    .command('version')
    .description('Output the current version')
    .action(() => { console.log(pkg.version); });
program.parse(process.argv);
if (!process.argv.slice(2).length) {
    printHeader('Forge CLI');
    program.outputHelp();
    console.log('\n' + chalk.cyan('Run "forge --help" for detailed command information.'));
}
//# sourceMappingURL=index.js.map