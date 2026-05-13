/**
 * forge xp — View XP, level, and progress
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getXpState, getLevelInfo, awardXp, getXpEventTypes, resetXp, getBadgeDef } from '../lib/gamification.js';

function makeProgressBar(fraction: number, width = 20): string {
  const filled = Math.round(fraction * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const pct = (fraction * 100).toFixed(0);
  return `${bar} ${pct}%`;
}

export default new Command('xp')
  .description('View XP, level, and progress')
  .argument('[action]', 'XP action to award (e.g. command_run, pack_built)')
  .option('-r, --reset', 'Reset XP tracking')
  .option('-j, --json', 'Output as JSON')
  .action((action: string | undefined, opts: { reset?: boolean; json?: boolean }) => {
    if (opts.reset) {
      resetXp();
      console.log(chalk.green('✓ XP tracking reset'));
      return;
    }

    if (action) {
      try {
        const result = awardXp(action);
        const info = getLevelInfo(result.state.total);

        if (opts.json) {
          console.log(JSON.stringify({ awarded: result.xp, ...info, newBadges: result.newBadges }));
          return;
        }

        console.log(chalk.green(`✓ +${result.xp} XP`));
        if (result.newBadges.length > 0) {
          for (const badgeId of result.newBadges) {
            const def = getBadgeDef(badgeId);
            console.log(chalk.yellow(`🏅 New badge: ${def?.label || badgeId}`));
          }
        }
        console.log();
      } catch (e: any) {
        console.error(chalk.red('✗'), e.message);
        process.exit(1);
      }
      return;
    }

    // Default: show current state
    const state = getXpState();
    const info = getLevelInfo(state.total);

    if (opts.json) {
      console.log(JSON.stringify({
        total: state.total,
        level: state.level,
        nextLevelXp: info.xpForNext,
        progress: info.progress,
        badges: state.badges,
        events: state.events.slice(-10),
        commandCount: state.commandCount,
      }));
      return;
    }

    console.log();
    console.log(`  ${chalk.bold('Level')}     ${chalk.cyan(info.level)}`);
    console.log(`  ${chalk.bold('XP')}        ${chalk.yellow(info.currentXp)} / ${chalk.gray(info.xpForNext)}`);
    console.log(`  ${chalk.bold('Progress')}  ${chalk.hex('#8b5cf6')(makeProgressBar(Math.min(info.progress, 1)))}`);
    console.log(`  ${chalk.bold('Commands')}  ${chalk.white(state.commandCount)}`);
    console.log(`  ${chalk.bold('Badges')}    ${state.badges.length > 0 ? chalk.green(state.badges.length) : chalk.gray('none yet')}`);
    console.log();

    // Show recent events
    if (state.events.length > 0) {
      const recent = state.events.slice(-5).reverse();
      console.log(chalk.dim('  Recent:'));
      for (const ev of recent) {
        const date = new Date(ev.ts);
        console.log(`    ${chalk.green('+' + ev.xp)} ${chalk.dim(ev.action.padEnd(18))} ${chalk.gray(date.toLocaleDateString())}`);
      }
      console.log();
    }

    // Show available XP actions
    console.log(chalk.dim('  Award XP: forge xp <action>'));
    console.log(chalk.dim(`  Actions: ${Object.keys(getXpEventTypes()).join(', ')}`));
    console.log();
  });
