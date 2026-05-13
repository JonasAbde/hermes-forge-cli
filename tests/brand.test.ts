/**
 * Tests for the Forge CLI brand package
 * Covers: colors, logo, theme (panels, bullets, progress bars)
 */
import { describe, it, expect } from 'vitest';

describe('brand / colors', () => {
  it('exports COLORS with primary indigo', async () => {
    const { COLORS } = await import('../src/brand/colors.js');
    expect(COLORS.primary).toBe('#6366f1');
  });

  it('exports semantic colors (success, warning, error)', async () => {
    const { COLORS } = await import('../src/brand/colors.js');
    expect(COLORS.success).toBe('#10b981');
    expect(COLORS.warning).toBe('#f59e0b');
    expect(COLORS.error).toBe('#ef4444');
  });

  it('exports CHALK_COLORS as hex strings', async () => {
    const { CHALK_COLORS } = await import('../src/brand/colors.js');
    expect(CHALK_COLORS.primary).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('exports GRADIENTS arrays', async () => {
    const { GRADIENTS } = await import('../src/brand/colors.js');
    expect(GRADIENTS.brand).toHaveLength(3);
    expect(GRADIENTS.success).toHaveLength(2);
  });
});

describe('brand / logo', () => {
  it('renders large logo without errors', async () => {
    const { renderLogo } = await import('../src/brand/logo.js');
    const output = renderLogo('large');
    expect(output).toBeTruthy();
    expect(output.length).toBeGreaterThan(50);
    expect(output).toContain('═');
  });

  it('renders small logo without errors', async () => {
    const { renderLogo } = await import('../src/brand/logo.js');
    const output = renderLogo('small');
    expect(output).toBeTruthy();
    expect(output).toContain('╔');
  });

  it('renders compact logo', async () => {
    const { renderLogoCompact } = await import('../src/brand/logo.js');
    expect(renderLogoCompact()).toContain('FORGE');
  });
});

describe('brand / theme', () => {
  it('separator returns string of correct length', async () => {
    const { separator } = await import('../src/brand/theme.js');
    const result = separator();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(50);
  });

  it('panel renders with title', async () => {
    const { panel } = await import('../src/brand/theme.js');
    const result = panel(['Line 1', 'Line 2'], { title: 'Test' });
    expect(result).toContain('Test');
    expect(result).toContain('Line 1');
    expect(result).toContain('Line 2');
  });

  it('panel renders without title', async () => {
    const { panel } = await import('../src/brand/theme.js');
    const result = panel(['Content']);
    expect(result).toContain('Content');
    expect(result).toMatch(/^[┌└├┤│─]/);
  });

  it('bullet functions return formatted strings', async () => {
    const { bullet, bulletSuccess, bulletError, bulletWarning, bulletInfo } = await import('../src/brand/theme.js');
    expect(bullet('test')).toContain('test');
    expect(bulletSuccess('ok')).toContain('ok');
    expect(bulletError('fail')).toContain('fail');
    expect(bulletWarning('warn')).toContain('warn');
    expect(bulletInfo('info')).toContain('info');
  });

  it('progressBar renders correctly', async () => {
    const { progressBar } = await import('../src/brand/theme.js');
    const result = progressBar(50, 100, 20);
    expect(result).toContain('50%');
  });

  it('progressBar at 0%', async () => {
    const { progressBar } = await import('../src/brand/theme.js');
    const result = progressBar(0, 100, 20);
    expect(result).toContain('0%');
  });

  it('progressBar at 100%', async () => {
    const { progressBar } = await import('../src/brand/theme.js');
    const result = progressBar(100, 100, 20);
    expect(result).toContain('100%');
  });

  it('kv returns formatted key-value pair', async () => {
    const { kv } = await import('../src/brand/theme.js');
    const result = kv('Name', 'Test');
    expect(result).toContain('Name');
    expect(result).toContain('Test');
  });

  it('label returns formatted label', async () => {
    const { label } = await import('../src/brand/theme.js');
    const result = label('NEW');
    expect(result).toContain('NEW');
  });

  it('metricRow formats multiple metrics', async () => {
    const { metricRow } = await import('../src/brand/theme.js');
    const result = metricRow([
      { label: 'API', value: 'OK' },
      { label: 'DB', value: 'UP' },
    ]);
    expect(result).toContain('api');
    expect(result).toContain('OK');
    expect(result).toContain('db');
    expect(result).toContain('UP');
  });

  it('SPINNER_FRAMES has dot frames', async () => {
    const { SPINNER_FRAMES } = await import('../src/brand/theme.js');
    expect(SPINNER_FRAMES.dots.length).toBeGreaterThan(5);
    expect(SPINNER_FRAMES.arrows.length).toBeGreaterThan(3);
  });
});

describe('brand / index barrel', () => {
  it('re-exports all brand modules', async () => {
    const brand = await import('../src/brand/index.js');
    expect(brand.COLORS).toBeDefined();
    expect(brand.renderLogo).toBeInstanceOf(Function);
    expect(brand.panel).toBeInstanceOf(Function);
    expect(brand.bulletSuccess).toBeInstanceOf(Function);
    expect(brand.progressBar).toBeInstanceOf(Function);
    expect(brand.SPINNER_FRAMES).toBeDefined();
  });
});
