#!/usr/bin/env node
/**
 * Forge CLI — Main Entry Point
 *
 * Fast-path architecture:
 * - --help and --version resolve instantly (no module loading)
 * - All command modules are lazy-loaded via dynamic import()
 * - Extensions are loaded after built-in commands
 */
import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { printHeader } from './lib/output.js';
import chalk from 'chalk';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const program = new Command();

// ─── Root config (always loaded) ───
program
  .name('forge')
  .description('Forge CLI — unified development, pack management, MCP tools, AI queries, and agent management')
  .version(pkg.version)
  .option('--verbose', 'enable verbose output')
  .showHelpAfterError();

// ─── Fast-path: --version ───
if (process.argv.includes('--version') || process.argv.includes('-V')) {
  console.log(pkg.version);
  process.exit(0);
}

// ─── Fast-path: --help (only for root, not subcommands) ───
if (process.argv.length <= 2 || (process.argv[2] && !process.argv[3] && (process.argv.includes('--help') || process.argv.includes('-h')))) {
  // Show help without loading all commands — use precomputed if available
  const showHelp = async () => {
    // Only load commands needed for help output
    const { default: statusCmd } = await import('./commands/status.js');
    program.addCommand(statusCmd);
    // Register placeholder for help display
    program.addCommand(new Command('ask').description('Ask questions about the Forge ecosystem'));
    program.addCommand(new Command('suggest').description('Analyze ecosystem and suggest improvements'));
    program.addCommand(new Command('agent').alias('agents').description('Manage Forge agents'));
    program.addCommand(new Command('plugin').alias('plugins').description('Manage Forge plugins and extensions'));
    program.addCommand(new Command('tui').alias('tu').description('Launch terminal UI dashboard'));
    program.addCommand(new Command('pack').description('Manage Agent Packs'));
    program.addCommand(new Command('remote').description('Interact with remote forge.tekup.dk'));
    program.addCommand(new Command('mcp').description('Manage MCP Registry server'));
    program.addCommand(new Command('doctor').description('Run comprehensive system diagnostics'));
    program.addCommand(new Command('dev').description('Start development services'));
    program.addCommand(new Command('health').description('Run health checks against Forge'));
    program.addCommand(new Command('deploy').description('Manage deployments'));
    program.addCommand(new Command('config').description('Manage CLI configuration'));
    program.addCommand(new Command('logs').description('View service logs'));
    program.addCommand(new Command('monitor').description('Real-time monitoring dashboard'));
    program.addCommand(new Command('schedule').description('Task scheduler'));
    program.addCommand(new Command('workspace').alias('ws').description('Manage workspaces'));
    program.addCommand(new Command('interactive').alias('i').description('Interactive mode'));
    program.addCommand(new Command('upgrade').description('Upgrade Forge CLI'));
    program.addCommand(new Command('backup').description('Manage backups'));
    program.addCommand(new Command('completion').description('Generate shell completions'));
    program.addCommand(new Command('alias').description('Manage command aliases'));
    program.addCommand(new Command('open').description('Open Forge URLs'));
    program.addCommand(new Command('env').description('Manage environment config'));
    program.addCommand(new Command('init').description('Initialize a project from template'));
    program.addCommand(new Command('docs').description('Start documentation server'));
    program.addCommand(new Command('notify').description('Manage notifications'));

    printHeader('Forge CLI');
    program.outputHelp();
    console.log('\n' + chalk.hex('#8b5cf6')('  ⚡ AI-native: forge ask, forge suggest, forge agent'));
    console.log(chalk.hex('#6366f1')('  🖥️  TUI: forge tui | 📦 Extensions: forge plugin list'));
    console.log(chalk.hex('#6b7280')('  forge.tekup.dk · v' + pkg.version + '\n'));
  };
    showHelp().then(() => process.exit(0)).catch((err) => {
        console.error('Help display error:', err);
        process.exit(1);
    });
}

// ─── Fast-path: version command (standalone) ───
if (process.argv[2] === 'version') {
  console.log(pkg.version);
  process.exit(0);
}

// ─── Full mode: lazy-load all commands ───
async function main() {
  // Extension dirs prepared first
  const { ensureExtensionDirs } = await import('./lib/extensionManager.js');
  ensureExtensionDirs();

  // Lazy-load all command modules
  const commands = await Promise.all([
    import('./commands/status.js'),
    import('./commands/doctor.js'),
    import('./commands/dev.js'),
    import('./commands/docs.js'),
    import('./commands/open.js'),
    import('./commands/pack/index.js'),
    import('./commands/mcp/index.js'),
    import('./commands/config.js'),
    import('./commands/env.js'),
    import('./commands/logs.js'),
    import('./commands/monitor.js'),
    import('./commands/init.js'),
    import('./commands/plugin.js'),
    import('./commands/completion.js'),
    import('./commands/alias.js'),
    import('./commands/backup.js'),
    import('./commands/upgrade.js'),
    import('./commands/schedule.js'),
    import('./commands/notify.js'),
    import('./commands/workspace.js'),
    import('./commands/interactive.js'),
    import('./commands/remote/index.js'),
    import('./commands/deploy.js'),
    import('./commands/health.js'),
    import('./commands/tui.js'),
    import('./commands/ask.js'),
    import('./commands/suggest.js'),
    import('./commands/agent.js'),
  ]);

  commands.forEach(cmd => program.addCommand(cmd.default));

  // Inject extension commands
  const { injectExtensionCommands } = await import('./lib/extensionManager.js');
  injectExtensionCommands(program);

  // Version subcommand
  program
    .command('version')
    .description('Output the current version')
    .action(() => { console.log(pkg.version); });

  program.parse(process.argv);
}

main().catch(err => {
  console.error(chalk.red('✗ Fatal:'), err.message);
  process.exit(1);
});
