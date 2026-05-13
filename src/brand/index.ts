/**
 * Hermes Forge — Brand Package
 *
 * Visual identity system shared across CLI, TUI, and tooling.
 * Usage: import { renderLogo, panel, COLORS } from '../brand/index.js';
 */

export { COLORS, CHALK_COLORS, GRADIENTS } from './colors.js';
export { renderLogo, renderLogoCompact } from './logo.js';
export {
  separator,
  sectionDivider,
  horizontalRule,
  panel,
  label,
  badge,
  kv,
  kvRight,
  metricRow,
  bullet,
  bulletSuccess,
  bulletError,
  bulletWarning,
  bulletInfo,
  progressBar,
  SPINNER_FRAMES,
} from './theme.js';
