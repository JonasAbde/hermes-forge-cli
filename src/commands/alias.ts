import { Command } from 'commander';
import chalk from 'chalk';
import { config } from '../lib/configManager.js';
import { printHeader, printSuccess, printError, printInfo, printWarning } from '../lib/output.js';
import { default as Table } from 'cli-table3';

interface AliasMap {
  [name: string]: string;
}

// Get aliases from config
function getAliases(): AliasMap {
  const cfg = config.get();
  return (cfg.aliases as AliasMap) || {};
}

// Save aliases to config
function saveAliases(aliases: AliasMap): void {
  // We need to add aliases support to configManager first
  // For now, we'll use a workaround
  const cfg = config as any;
  if (cfg.set) {
    cfg.set('aliases', aliases);
  }
}

const program = new Command('alias')
  .description('Manage command aliases')
  .addCommand(
    new Command('list')
      .description('List all aliases')
      .alias('ls')
      .option('--json', 'output as JSON')
      .action((options) => {
        const aliases = getAliases();
        
        if (options.json) {
          console.log(JSON.stringify(aliases, null, 2));
          return;
        }
        
        printHeader('Command Aliases');
        
        const entries = Object.entries(aliases);
        if (entries.length === 0) {
          printInfo('No aliases defined');
          printInfo('Create with: forge alias set <name> <command>');
          return;
        }
        
        const table = new Table({
          head: [chalk.bold('Alias'), chalk.bold('Command')],
          colWidths: [20, 60],
          style: { head: ['cyan'] }
        });
        
        entries.forEach(([name, command]) => {
          table.push([chalk.yellow(name), command]);
        });
        
        console.log(table.toString());
        printInfo(`\nTotal: ${entries.length} alias(es)`);
      })
  )
  .addCommand(
    new Command('set')
      .description('Create or update an alias')
      .argument('<name>', 'alias name')
      .argument('<command>', 'command to alias (use quotes for multi-word)')
      .action((name, command) => {
        printHeader('Set Alias');
        
        // Validate alias name
        if (name.includes(' ') || name.includes('\t')) {
          printError('Alias name cannot contain spaces');
          process.exit(1);
        }
        
        // Check for reserved names
        const reserved = ['status', 'doctor', 'dev', 'docs', 'open', 'pack', 'mcp', 'config', 'env', 'logs', 'monitor', 'init', 'plugin', 'alias', 'help'];
        if (reserved.includes(name)) {
          printError(`Cannot override reserved command: ${name}`);
          process.exit(1);
        }
        
        const aliases = getAliases();
        const existed = name in aliases;
        
        aliases[name] = command;
        saveAliases(aliases);
        
        if (existed) {
          printSuccess(`Updated alias: ${chalk.yellow(name)}`);
        } else {
          printSuccess(`Created alias: ${chalk.yellow(name)}`);
        }
        
        printInfo(`  ${name} → ${chalk.gray(command)}`);
        printInfo('\nUsage:');
        printInfo(`  forge ${name}`);
      })
  )
  .addCommand(
    new Command('remove')
      .description('Remove an alias')
      .alias('rm')
      .argument('<name>', 'alias name to remove')
      .action((name) => {
        printHeader('Remove Alias');
        
        const aliases = getAliases();
        
        if (!(name in aliases)) {
          printError(`Alias not found: ${name}`);
          process.exit(1);
        }
        
        delete aliases[name];
        saveAliases(aliases);
        
        printSuccess(`Removed alias: ${name}`);
      })
  )
  .addCommand(
    new Command('show')
      .description('Show alias details')
      .argument('<name>', 'alias name')
      .action((name) => {
        const aliases = getAliases();
        
        if (!(name in aliases)) {
          printError(`Alias not found: ${name}`);
          process.exit(1);
        }
        
        printHeader(`Alias: ${name}`);
        console.log(`  ${chalk.yellow(name)} → ${chalk.cyan(aliases[name])}`);
        console.log('');
        printInfo('Usage:');
        console.log(`  forge ${name}`);
      })
  )
  .addCommand(
    new Command('run')
      .description('Execute an alias (used internally)')
      .argument('<name>', 'alias name')
      .allowUnknownOption()
      .action((name) => {
        const aliases = getAliases();
        
        if (!(name in aliases)) {
          printError(`Unknown alias: ${name}`);
          process.exit(1);
        }
        
        // Get the command
        const command = aliases[name];
        
        printInfo(`Running: ${chalk.gray(command)}`);
        console.log('');
        
        // Execute would be handled by the CLI entry point
        // This is a placeholder for the actual execution logic
        console.log(`Would execute: ${command}`);
      })
  )
  .addCommand(
    new Command('init')
      .description('Initialize with common aliases')
      .option('--force', 'overwrite existing aliases')
      .action((options) => {
        printHeader('Initialize Common Aliases');
        
        const commonAliases: AliasMap = {
          's': 'status',
          'st': 'status',
          'd': 'dev',
          'dd': 'dev --with-docs',
          'doc': 'docs',
          'dr': 'doctor',
          'm': 'monitor',
          'l': 'logs',
          'p': 'pack list',
          'pl': 'pack list',
          'pb': 'pack build',
          'mcp-start': 'mcp start',
          'mcp-stop': 'mcp stop',
          'open-web': 'open web',
          'open-docs': 'open docs',
        };
        
        const aliases = getAliases();
        let added = 0;
        let skipped = 0;
        
        for (const [name, command] of Object.entries(commonAliases)) {
          if (name in aliases && !options.force) {
            skipped++;
            continue;
          }
          aliases[name] = command;
          added++;
        }
        
        saveAliases(aliases);
        
        if (added > 0) {
          printSuccess(`Added ${added} common alias(es)`);
        }
        if (skipped > 0) {
          printWarning(`Skipped ${skipped} existing alias(es) (use --force to overwrite)`);
        }
        
        printInfo('\nNew aliases:');
        Object.entries(commonAliases).forEach(([name, cmd]) => {
          console.log(`  ${chalk.yellow(name.padEnd(12))} → ${chalk.gray(cmd)}`);
        });
      })
  );

export default program;
