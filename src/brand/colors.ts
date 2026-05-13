/**
 * Hermes Forge — Brand Color Palette
 * Design tokens matching forge.tekup.dk web app
 */

export const COLORS = {
  /** Primary indigo */
  primary: '#6366f1',
  primaryLight: '#818cf8',
  primaryDark: '#4338ca',

  /** Violet accent */
  accent: '#8b5cf6',
  accentLight: '#a78bfa',
  accentDark: '#6d28d9',

  /** Semantic */
  success: '#10b981',
  successLight: '#34d399',
  warning: '#f59e0b',
  warningLight: '#fbbf24',
  error: '#ef4444',
  errorLight: '#f87171',
  info: '#06b6d4',

  /** Neutrals */
  surface: '#1f2937',
  surfaceLight: '#374151',
  border: '#e5e7eb',
  borderDark: '#9ca3af',
  text: '#f9fafb',
  textMuted: '#9ca3af',
  textDim: '#6b7280',
} as const;

/** Chalk-safe hex colors for terminal */
export const CHALK_COLORS = {
  primary: '#6366f1',
  accent: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#06b6d4',
} as const;

export const GRADIENTS = {
  brand: ['#6366f1', '#8b5cf6', '#a78bfa'] as const,
  success: ['#10b981', '#34d399'] as const,
  warning: ['#f59e0b', '#fbbf24'] as const,
  error: ['#ef4444', '#f87171'] as const,
} as const;
