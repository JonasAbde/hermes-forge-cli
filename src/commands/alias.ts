import { Command } from 'commander';
import { execa } from 'execa';
import chalk from 'chalk';
import { config } from '../lib/configManager.js';
import { printHeader, printSuccess, printError, printInfo, printWarning } from '../lib/output.js';
import { default as Table } from 'cli-table3';

interface AliasMap {
  [name: string]: string;
}

function getAliases(): AliasMap {
  const cfg = config.get();
  return (cfg.aliases as AliasMap) || {};
}

function saveAliases(aliases: AliasMap): void {
  (config as unknown as { set(k: string, v: unknown): void }).set('aliases', aliases);
}

/** All top-level built-in command names — cannot be overridden by aliases. */
const RESERVED = new Set([
  'status', 'doctor', 'dev', 'docs', 'open', 'pack', 'mcp', 'config', 'env',
  'logs', 'monitor', 'init', 'plugin', 'completion', 'alias', 'backup', 'upgrade',
  'schedule', 'notify', 'workspace', 'interactive', 'help', 'version',
]);

const program = new Command('alias')
  .description('Manage command aliases for forge')
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
          printInfo('No aliases defined.');
          printInfo('Create one: forge alias set <name> "<command>"');
          printInfo('Or load defaults: forge alias init');
          return;
        }

        const table = new Table({
          head: [chalk.bold('Alias'), chalk.bold('Command')],
          colWidths: [20, 60],
          style: { head: ['cyan'] },
        });

        entries.forEach(([name, command]) => {
          table.push([chalk.yellow(name), command]);
        });

        console.log(table.toString());
        printInfo(`\nTotal: ${entries.length} alias(es)`);
        printInfo('Run any alias with: forge alias run <name>');
      })
  )
  .addCommand(
    new Command('set')
      .description('Create or update an alias')
      .argument('<name>', 'alias name (no spaces)')
      .argument('<command...>', 'forge command to run (e.g. "pack list --catalog")')
      .action((name, commandParts: string[]) => {
        printHeader('Set Alias');

        if (/\s/.test(name)) {
          printError('Alias name cannot contain spaces.');
          process.exit(1);
        }

        if (RESERVED.has(name)) {
          printError(`Cannot override reserved command: ${name}`);
          process.exit(1);
        }

        const command = commandParts.join(' ');
        const aliases = getAliases();
        const existed = name in aliases;

        aliases[name] = command;
        saveAliases(aliases);

        if (existed) {
          printSuccess(`Updated alias: ${chalk.yellow(name)}`);
        } else {
          printSuccess(`Created alias: ${chalk.yellow(name)}`);
        }
        printInfo(`  ${chalk.yellow(name)} → ${chalk.gray(command)}`);
        printInfo('\nRun it with:');
        printInfo(`  forge alias run ${name}`);
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

        const command = aliases[name];
        delete aliases[name];
        saveAliases(aliases);

        printSuccess(`Removed alias: ${name}`);
        printInfo(`  was: ${chalk.gray(command)}`);
      })
  )
  .addCommand(
    new Command('show')
      .description('Show details for an alias')
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
        printInfo('Run it with:');
        console.log(`  forge alias run ${name}`);
      })
  )
  .addCommand(
    new Command('run')
      .description('Execute an alias by name')
      .argument('<name>', 'alias name')
      .allowUnknownOption()
      .action(async (name, _opts, cmd) => {
        const aliases = getAliases();

        if (!(name in aliases)) {
          printError(`Unknown alias: ${name}`);
          printInfo('List aliases with: forge alias list');
          process.exit(1);
        }

        const aliasedCommand = aliases[name];
        // Extra args passed after the alias name (e.g. forge alias run p --json)
        const extraArgs = cmd.args.slice(1);

        const parts = aliasedCommand.trim().split(/\s+/);
        const fullArgs = [...parts, ...extraArgs];

        printInfo(`Running: forge ${chalk.gray(fullArgs.join(' '))}\n`);

        try {
          // Find the forge binary: prefer the one in PATH, fallback to this process
          const forgeBin = process.argv[1]; // current entry point (bin/forge.js)
          await execa(process.execPath, [forgeBin, ...fullArgs], {
            stdio: 'inherit',
            cwd: process.cwd(),
            env: { ...process.env },
          });
        } catch (err: unknown) {
          const e = err as { exitCode?: number; signal?: string; message?: string };
          if (e.signal === 'SIGINT') {
            // User Ctrl+C — exit cleanly
            process.exit(130);
          }
          process.exit(e.exitCode ?? 1);
        }
      })
  )
  .addCommand(
    new Command('init')
      .description('Add common shortcut aliases')
      .option('--force', 'overwrite existing aliases')
      .action((options) => {
        printHeader('Initialize Common Aliases');

        const commonAliases: AliasMap = {
          s:          'status',
          st:         'status',
          d:          'dev',
          dd:         'dev --with-docs',
          doc:        'docs',
          dr:         'doctor',
          m:          'monitor',
          l:          'logs',
          p:          'pack list',
          pl:         'pack list',
          pb:         'pack build',
          'mcp-start':'mcp start',
          'mcp-stop': 'mcp stop',
          // open targets: docs, hub, showcase, api (valid targets in open.ts)
          'open-docs':    'open docs',
          'open-hub':     'open hub',
          'open-showcase':'open showcase',
          'open-api':     'open api',
        };

        const aliases = getAliases();
        let added = 0;
        let skipped = 0;

        for (const [aliasName, command] of Object.entries(commonAliases)) {
          if (aliasName in aliases && !options.force) {
            skipped++;
            continue;
          }
          aliases[aliasName] = command;
          added++;
        }

        saveAliases(aliases);

        if (added > 0) printSuccess(`Added ${added} alias(es).`);
        if (skipped > 0) printWarning(`Skipped ${skipped} existing alias(es). Use --force to overwrite.`);

        const table = new Table({
          head: [chalk.bold('Alias'), chalk.bold('Command')],
          colWidths: [16, 40],
          style: { head: ['cyan'] },
        });
        Object.entries(commonAliases).forEach(([n, c]) => table.push([chalk.yellow(n), c]));
        console.log('\n' + table.toString());
      })
  );

export default program;
