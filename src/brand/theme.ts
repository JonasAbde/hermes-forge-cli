/**
 * Hermes Forge — Brand Display Utilities
 * Box drawing, panels, separators, labels
 */
import chalk from 'chalk';
import { COLORS } from './colors.js';

const WIDTH = 60;

/** ─── Separators ─── */

export function separator(char: string = '─'): string {
  return chalk.hex(COLORS.textDim)(char.repeat(WIDTH));
}

export function sectionDivider(): string {
  return chalk.hex(COLORS.textDim)('┠' + '─'.repeat(WIDTH - 2) + '┫');
}

export function horizontalRule(): string {
  return chalk.hex(COLORS.primary)('━'.repeat(WIDTH));
}

/** ─── Panels ─── */

export interface PanelOptions {
  title?: string;
  width?: number;
  padding?: number;
}

export function panel(lines: string[], opts: PanelOptions = {}): string {
  const w = opts.width ?? WIDTH;
  const p = opts.padding ?? 1;
  const pad = ' '.repeat(p);
  const border = chalk.hex(COLORS.textDim);

  let out = '';
  if (opts.title) {
    out += border('┌─ ') + chalk.hex(COLORS.primary).bold(opts.title) + border(' ─' + '─'.repeat(w - opts.title.length - 7)) + '┐\n';
  } else {
    out += border('┌' + '─'.repeat(w) + '┐\n');
  }

  for (const line of lines) {
    const content = pad + line;
    const remaining = w - content.length - p;
    out += border('│') + content + border(' '.repeat(Math.max(0, remaining)) + '│\n');
  }

  out += border('└' + '─'.repeat(w) + '┘');
  return out;
}

/** ─── Labels ─── */

export function label(text: string): string {
  return chalk.bgHex(COLORS.primary).hex('#ffffff')(' ' + text + ' ');
}

export function badge(text: string, color: string = COLORS.primary): string {
  return chalk.hex(color)(`[${text}]`);
}

/** ─── Key-Value display ─── */

export function kv(key: string, value: string): string {
  return chalk.hex(COLORS.textDim)(key + ': ') + chalk.hex(COLORS.text)(value);
}

export function kvRight(key: string, value: string, width: number = 60): string {
  const kvStr = chalk.hex(COLORS.textDim)(key + ': ') + chalk.hex(COLORS.text)(value);
  return kvStr.padStart(width);
}

/** ─── Stats / Metrics ─── */

export interface Metric {
  label: string;
  value: string;
  color?: string;
}

export function metricRow(metrics: Metric[], cols: number = 3): string {
  const items: string[] = [];
  for (const m of metrics) {
    const label = chalk.hex(COLORS.textDim)(m.label.toLowerCase());
    const value = chalk.hex(m.color ?? COLORS.primary).bold(m.value);
    items.push(`${label} ${value}`);
  }

  const colWidth = Math.floor(WIDTH / cols);
  return items.map((item, i) => {
    const pos = i % cols;
    if (pos === cols - 1) return item;
    return item.padEnd(colWidth);
  }).join('');
}

/** ─── Bullet list ─── */

export function bullet(text: string, symbol: string = '•'): string {
  return chalk.hex(COLORS.primary)(symbol + ' ') + chalk.hex(COLORS.text)(text);
}

export function bulletSuccess(text: string): string {
  return chalk.hex(COLORS.success)('✓ ') + chalk.hex(COLORS.text)(text);
}

export function bulletError(text: string): string {
  return chalk.hex(COLORS.error)('✗ ') + chalk.hex(COLORS.text)(text);
}

export function bulletWarning(text: string): string {
  return chalk.hex(COLORS.warning)('⚠ ') + chalk.hex(COLORS.text)(text);
}

export function bulletInfo(text: string): string {
  return chalk.hex(COLORS.info)('ℹ ') + chalk.hex(COLORS.text)(text);
}

/** ─── Spinner frames ─── */

export const SPINNER_FRAMES = {
  dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  arrows: ['▹▹▹▹▹', '▸▹▹▹▹', '▹▸▹▹▹', '▹▹▸▹▹', '▹▹▹▸▹', '▹▹▹▹▸'],
  pulse: ['█', '▓', '▒', '░', '▒', '▓'],
};

/** ─── Progress bar ─── */

export function progressBar(current: number, total: number, width: number = 30): string {
  const ratio = Math.min(1, current / total);
  const filled = Math.floor(ratio * width);
  const empty = width - filled;
  const bar = chalk.hex(COLORS.primary)('█'.repeat(filled)) + chalk.hex(COLORS.border)('█'.repeat(empty));
  const pct = chalk.hex(COLORS.textDim)(` ${Math.round(ratio * 100)}%`);
  return bar + pct;
}
