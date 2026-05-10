/**
 * Tests for monitor TUI helper functions
 */
import { describe, it, expect } from 'vitest';

// Helper functions replicated from monitor.ts for testability
// (They aren't exported from the command module itself)
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m`;
  return `${Math.floor(ms / 3600000)}h`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
}

function getStateColor(
  state: string,
): { name: string; hex: string } {
  switch (state) {
    case 'up': return { name: 'green', hex: '#00FF00' };
    case 'down': return { name: 'gray', hex: '#808080' };
    case 'crashed': return { name: 'red', hex: '#FF0000' };
    case 'starting': return { name: 'yellow', hex: '#FFFF00' };
    default: return { name: 'white', hex: '#FFFFFF' };
  }
}

function getStateIcon(state: string): string {
  switch (state) {
    case 'up': return '●';
    case 'down': return '○';
    case 'crashed': return '✗';
    case 'starting': return '◐';
    default: return '?';
  }
}

describe('monitor helpers', () => {
  describe('formatDuration', () => {
    it('formats milliseconds', () => {
      expect(formatDuration(500)).toBe('500ms');
      expect(formatDuration(0)).toBe('0ms');
      expect(formatDuration(999)).toBe('999ms');
    });

    it('formats seconds', () => {
      expect(formatDuration(1000)).toBe('1s');
      expect(formatDuration(30000)).toBe('30s');
      expect(formatDuration(59000)).toBe('59s');
    });

    it('formats minutes', () => {
      expect(formatDuration(60000)).toBe('1m');
      expect(formatDuration(3600000 - 1)).toBe('59m');
    });

    it('formats hours', () => {
      expect(formatDuration(3600000)).toBe('1h');
      expect(formatDuration(7200000)).toBe('2h');
      expect(formatDuration(86400000)).toBe('24h');
    });
  });

  describe('formatBytes', () => {
    it('formats bytes', () => {
      expect(formatBytes(0)).toBe('0B');
      expect(formatBytes(512)).toBe('512B');
      expect(formatBytes(1023)).toBe('1023B');
    });

    it('formats KB', () => {
      expect(formatBytes(1024)).toBe('1.0KB');
      expect(formatBytes(1536)).toBe('1.5KB');
    });

    it('formats MB', () => {
      expect(formatBytes(1048576)).toBe('1.0MB');
      expect(formatBytes(1572864)).toBe('1.5MB');
    });

    it('formats GB', () => {
      expect(formatBytes(1073741824)).toBe('1.0GB');
    });
  });

  describe('getStateColor', () => {
    it('returns green for up', () => {
      expect(getStateColor('up').name).toBe('green');
    });

    it('returns gray for down', () => {
      expect(getStateColor('down').name).toBe('gray');
    });

    it('returns red for crashed', () => {
      expect(getStateColor('crashed').name).toBe('red');
    });

    it('returns yellow for starting', () => {
      expect(getStateColor('starting').name).toBe('yellow');
    });

    it('returns white for unknown', () => {
      expect(getStateColor('unknown').name).toBe('white');
    });
  });

  describe('getStateIcon', () => {
    it('returns filled circle for up', () => {
      expect(getStateIcon('up')).toBe('●');
    });

    it('returns empty circle for down', () => {
      expect(getStateIcon('down')).toBe('○');
    });

    it('returns cross for crashed', () => {
      expect(getStateIcon('crashed')).toBe('✗');
    });

    it('returns partial circle for starting', () => {
      expect(getStateIcon('starting')).toBe('◐');
    });
  });
});
