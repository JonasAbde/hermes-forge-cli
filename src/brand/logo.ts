/**
 * Hermes Forge — ASCII Art Logo
 */
import chalk from 'chalk';
import { COLORS } from './colors.js';

// Large 5-line logo
const LOGO_LARGE = [
  '██╗  ██╗███████╗██████╗ ███╗   ███╗███████╗███████╗',
  '██║  ██║██╔════╝██╔══██╗████╗ ████║██╔════╝██╔════╝',
  '███████║█████╗  ██████╔╝██╔████╔██║█████╗  ███████╗',
  '██╔══██║██╔══╝  ██╔══██╗██║╚██╔╝██║██╔══╝  ╚════██║',
  '██║  ██║███████╗██║  ██║██║ ╚═╝ ██║███████╗███████║',
  '╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝╚══════╝',
  '                      F O R G E',
];

const LOGO_SMALL = [
  '╔═══╗╔═══╗╦  ╦╔═╗╔═╗╔╦╗',
  '╚═╗╗║║╔═╗║║  ║║║  ║ ║ ║ ',
  '╔═╝╔╝║╚═╝║╚═╗╔╝╚═╗╚═╗ ║ ',
  '╚═══╝╚═══╩  ╩╚═╝╚═╝╚═╝ ╩ ',
];

export type LogoSize = 'large' | 'small';

/**
 * Render the Hermes Forge ASCII logo with brand colors
 */
export function renderLogo(size: LogoSize = 'large'): string {
  const lines = size === 'large' ? LOGO_LARGE : LOGO_SMALL;
  return lines
    .map((line, i) => {
      // Gradient: top rows lighter indigo, bottom rows violet
      const ratio = i / lines.length;
      const color = ratio < 0.5 ? chalk.hex('#818cf8') : chalk.hex('#a78bfa');
      if (i === lines.length - 1 && size === 'large') {
        // "FORGE" text — use accent color
        return chalk.hex('#8b5cf6').bold(line);
      }
      return color(line);
    })
    .join('\n');
}

/**
 * Compact one-line version for status bar / TUI header
 */
export function renderLogoCompact(): string {
  // Simple unicode fallback: ⚡ FORGE
  return chalk.hex('#6366f1').bold('⬡ ') + chalk.hex('#8b5cf6').bold('FORGE');
}
