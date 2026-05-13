/**
 * forge badge — List badges and progress toward next
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getAllBadges, getXpState, getLevelInfo } from '../lib/gamification.js';

export default new Command('badge')
  .alias('badges')
  .description('View badges and achievements')
  .option('-j, --json', 'Output as JSON')
  .action((opts: { json?: boolean }) => {
    const state = getXpState();
    const info = getLevelInfo(state.total);
    const badges = getAllBadges();

    if (opts.json) {
      console.log(JSON.stringify({
        total: badges.length,
        unlocked: badges.filter(b => b.unlocked).length,
        badges: badges.map(b => ({ id: b.id, label: b.label, description: b.description, unlocked: b.unlocked })),
      }));
      return;
    }

    const unlocked = badges.filter(b => b.unlocked);
    const locked = badges.filter(b => !b.unlocked);

    console.log();
    console.log(`  ${chalk.bold('Badges')}  ${chalk.green(unlocked.length)}/${badges.length} unlocked · Level ${chalk.cyan(info.level)}`);
    console.log();

    if (unlocked.length > 0) {
      console.log(chalk.bold('  🏅 Unlocked'));
      for (const b of unlocked) {
        console.log(`    ${chalk.green('✅')} ${chalk.bold(b.label)} — ${chalk.dim(b.description)}`);
      }
      console.log();
    }

    if (locked.length > 0) {
      console.log(chalk.dim('  🔒 Locked'));
      for (const b of locked) {
        console.log(`    ${chalk.gray('⬜')} ${chalk.bold(b.label)} — ${chalk.dim(b.description)}`);
      }
      console.log();
    }

    console.log(chalk.dim('  Earn XP to unlock badges: forge xp <action>'));
    console.log();
  });
