/**
 * Forge CLI — Branded Output Utilities
 *
 * Replaces the original basic output.ts with full brand integration.
 */
import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import {
  renderLogo,
  renderLogoCompact,
  panel,
  separator,
  sectionDivider,
  kv,
  bullet,
  bulletSuccess,
  bulletError,
  bulletWarning,
  bulletInfo,
  metricRow,
  progressBar,
  label,
} from '../brand/index.js';

export const spinner = ora({
  color: 'blue',
  spinner: 'dots',
});

/** ─── Header ─── */

export function printHeader(title?: string): void {
  console.log('\n' + renderLogo());
  if (title) {
    console.log(chalk.hex('#8b5cf6').bold(`  ${title}`));
  }
  console.log(separator('━') + '\n');
}

export function printSection(title: string): void {
  console.log('\n' + sectionDivider());
  console.log(chalk.hex('#6366f1').bold(`  ${title}`));
  console.log(sectionDivider());
}

/** ─── Status messages ─── */

export function printSuccess(text: string): void {
  console.log(bulletSuccess(text));
}

export function printError(text: string): void {
  console.log(bulletError(text));
}

export function printWarning(text: string): void {
  console.log(bulletWarning(text));
}

export function printInfo(text: string): void {
  console.log(bulletInfo(text));
}

/** ─── Key-Value ─── */

export function printKV(key: string, value: string): void {
  console.log(kv(key, value));
}

/** ─── Panel ─── */

export function printPanel(lines: string[], opts?: { title?: string }): void {
  console.log('\n' + panel(lines, opts) + '\n');
}

/** ─── Tables ─── */

export function createServiceTable(
  data: Array<{
    name: string;
    port: number;
    status: string;
    url?: string;
    message?: string;
  }>,
): void {
  const table = new Table({
    head: [
      chalk.hex('#818cf8').bold('Service'),
      chalk.hex('#818cf8').bold('Port'),
      chalk.hex('#818cf8').bold('Status'),
      chalk.hex('#818cf8').bold('URL'),
    ],
    colWidths: [25, 8, 12, 35],
    style: { head: [], border: [] },
    chars: {
      top: '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
      bottom: '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
      left: '│', 'left-mid': '├', mid: '─', 'mid-mid': '┼',
      right: '│', 'right-mid': '┤',
      middle: '│',
    },
  });

  for (const row of data) {
    let statusStyle: string;
    if (row.status.includes('UP') || row.status.includes('ok')) {
      statusStyle = chalk.hex('#10b981')(row.status);
    } else if (row.status.includes('WARN')) {
      statusStyle = chalk.hex('#f59e0b')(row.status);
    } else {
      statusStyle = chalk.hex('#ef4444')(row.status);
    }
    table.push([row.name, String(row.port), statusStyle, row.url || row.message || '']);
  }

  console.log(table.toString());
}

/** ─── Custom table ─── */

export function printTable(headers: string[], rows: string[][]): void {
  const table = new Table({
    head: headers.map((h) => chalk.hex('#818cf8').bold(h)),
    style: { head: [], border: [] },
    chars: {
      top: '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
      bottom: '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
      left: '│', 'left-mid': '├', mid: '─', 'mid-mid': '┼',
      right: '│', 'right-mid': '┤',
      middle: '│',
    },
  });

  for (const row of rows) {
    table.push(row);
  }

  console.log(table.toString());
}

/** ─── Metrics ─── */

export function printMetricRow(metrics: { label: string; value: string; color?: string }[], cols: number = 3): void {
  console.log(metricRow(metrics, cols));
}

/** ─── Progress ─── */

export function printProgress(current: number, total: number, width: number = 30): void {
  console.log(progressBar(current, total, width));
}

/** ─── Box ─── */

export function box(text: string, title?: string): void {
  console.log(panel(text.split('\n'), { title }));
}

/** ─── Compact footer — shows after commands ─── */

export function printFooter(): void {
  console.log('\n' + separator() + '\n' + renderLogoCompact() + chalk.hex('#6b7280')(' v1.0.0 — forge.tekup.dk') + '\n');
}

/** ─── Legacy alias ─── */

export { renderLogo as printLogo, label as printLabel };
