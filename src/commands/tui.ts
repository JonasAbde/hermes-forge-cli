import { Command } from 'commander';
import { launchTUI } from '../tui/index.js';
import { renderLogoCompact } from '../brand/index.js';
import chalk from 'chalk';

const program = new Command('tui')
  .description('Launch the Hermes Forge terminal UI dashboard')
  .alias('tu')
  .option('-m, --mode <mode>', 'Initial view: dashboard, packs, health', 'dashboard')
  .option('--version', 'Show version before TUI')
  .action(async (opts: { mode: 'dashboard' | 'packs' | 'health'; version?: boolean }) => {
    if (opts.version) {
      console.log(renderLogoCompact() + chalk.hex('#6b7280')(' v1.0.0'));
      return;
    }

    console.log(chalk.hex('#6366f1')('\n  Launching TUI...\n'));
    launchTUI({ initialView: opts.mode });
  });

export default program;
