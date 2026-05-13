/**
 * forge leaderboard — Compare XP and achievements with others
 *
 * Fetches leaderboard data from the Forge API when authenticated.
 * Falls back to local-only display when offline.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getXpState } from '../lib/gamification.js';

export default new Command('leaderboard')
  .alias('lb')
  .description('View leaderboard rankings')
  .option('-r, --remote', 'Force fetch from remote Forge API')
  .option('-j, --json', 'Output as JSON')
  .action(async (opts: { remote?: boolean; json?: boolean }) => {
    const state = getXpState();

    // Try to fetch from remote API
    if (opts.remote || state.commandCount > 0) {
      try {
        const res = await fetch('https://forge.tekup.dk/api/forge/v1/leaderboard', {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(5000),
        });

        if (res.ok) {
          const data = await res.json();

          if (opts.json) {
            console.log(JSON.stringify({ local: state, remote: data }));
            return;
          }

          const entries = Array.isArray(data) ? data : data.entries || data.leaderboard || [];
          console.log();
          console.log(`  ${chalk.bold('🏆 Forge Leaderboard')}`);
          console.log();

          if (entries.length === 0) {
            console.log(chalk.dim('  No entries yet — be the first!'));
          } else {
            // Show top entries with rank
            const rows = entries.slice(0, 20).map((entry: any, i: number) => {
              const rank = i + 1;
              const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
              const name = entry.name || entry.username || entry.email || `Player ${rank}`;
              const xp = entry.total_xp ?? entry.xp ?? entry.score ?? 0;
              const level = entry.level ?? '-';
              return `  ${medal} ${chalk.bold(name)}  ${chalk.yellow(`${xp} XP`)}  ${chalk.dim(`Lv ${level}`)}`;
            });
            console.log(rows.join('\n'));
          }
          console.log();

          // Show your rank
          const myEntry = entries.find((e: any) => {
            const email = e.email || '';
            return email.includes('jonas') || email.includes('abde');
          });
          if (myEntry) {
            const myIdx = entries.indexOf(myEntry);
            console.log(`  ${chalk.dim('Your rank:')} #${myIdx + 1} of ${entries.length}`);
          } else {
            console.log(`  ${chalk.dim('Your local XP:')} ${chalk.yellow(state.total)} XP · Level ${chalk.cyan(state.level)}`);
            console.log(`  ${chalk.dim('Login to sync:')} ${chalk.cyan('forge remote login')}`);
          }
          console.log();
          return;
        }
      } catch {
        // Remote unavailable — fall through to local
      }
    }

    // Local fallback
    if (opts.json) {
      console.log(JSON.stringify({ local: state, remote: null }));
      return;
    }

    console.log();
    console.log(`  ${chalk.bold('🏆 Local Stats')}`);
    console.log();
    console.log(`  ${chalk.dim('XP:')}    ${chalk.yellow(state.total)}`);
    console.log(`  ${chalk.dim('Level:')} ${chalk.cyan(state.level)}`);
    console.log(`  ${chalk.dim('Badges:')} ${chalk.green(state.badges.length)}`);
    console.log(`  ${chalk.dim('Commands:')} ${chalk.white(state.commandCount)}`);
    console.log();
    console.log(`  ${chalk.dim('To see global rankings:')} ${chalk.cyan('forge remote login')}`);
    console.log(`  ${chalk.dim('Then:')} ${chalk.cyan('forge leaderboard --remote')}`);
    console.log();
  });
