#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { printHeader } from './lib/output.js';

const program = new Command();

program
  .name('forge')
  .description('Hermes Forge Platform CLI - unified development, pack management, and MCP tools')
  .version('0.1.0')
  .option('--verbose', 'enable verbose output')
  .showHelpAfterError();

// Static imports for reliable command registration
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

program.addCommand(statusCommand);
program.addCommand(doctorCommand);
program.addCommand(devCommand);
program.addCommand(docsCommand);
program.addCommand(openCommand);
program.addCommand(packCommand);
program.addCommand(mcpCommand);
program.addCommand(configCommand);
program.addCommand(envCommand);
program.addCommand(logsCommand);
program.addCommand(monitorCommand);
program.addCommand(initCommand);
program.addCommand(pluginCommand);
program.addCommand(completionCommand);
program.addCommand(aliasCommand);
program.addCommand(backupCommand);
program.addCommand(upgradeCommand);
program.addCommand(scheduleCommand);
program.addCommand(notifyCommand);
program.addCommand(workspaceCommand);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  printHeader('Forge CLI');
  program.outputHelp();
  console.log('\n' + chalk.cyan('Run "forge --help" for detailed command information.'));
}
