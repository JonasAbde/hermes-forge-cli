/**
 * Hermes Forge TUI — Live Logs
 *
 * Streams real-time logs from forge.tekup.dk API or systemd journal.
 */
import blessed from 'neo-blessed';

const { widget } = blessed;

/**
 * Create live log streaming view
 */
export function createLiveLogs(parent: any, onReady: (container: any) => void): void {
  const logBox = new widget.Log({
    parent,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    label: ' Live Logs (auto-refresh) ',
    border: { type: 'line', fg: 62 },
    style: { fg: 248, bg: 234, border: { fg: 62 } },
    scrollback: 500,
    tags: true,
    scrollOnInput: true,
  });

  logBox.log('{bold}Live Log Feed{/bold}');
  logBox.log('\u2500'.repeat(50));
  logBox.log('');

  // ─── Initial log entries ───
  logBox.log('{green-fg}\u2713{/green-fg} Log viewer initialized');
  logBox.log('');

  // ─── Poll /api/health periodically ───
  let entryCount = 0;

  async function pollLogs(): Promise<void> {
    try {
      const res = await fetch('https://forge.tekup.dk/api/health', {
        signal: AbortSignal.timeout(5000),
      });

      entryCount++;
      const ts = new Date().toLocaleTimeString();
      const status = res.ok ? '200 OK' : 'HTTP ' + res.status;
      const statusColor = res.ok ? 'green-fg' : 'red-fg';
      const body = await res.text().catch(() => '');

      logBox.log('{' + statusColor + '}\u25b6{/' + statusColor + '} [' + ts + '] /api/health \u2192 ' + status);

      // Parse body for more detail
      if (body) {
        let detail = '';
        try {
          const parsed = JSON.parse(body);
          if (parsed.status) detail = 'status=' + parsed.status;
          if (parsed.db) detail += ' db=' + parsed.db;
          if (parsed.uptime) {
            const secs = Math.floor(parsed.uptime);
            detail += ' uptime=' + Math.floor(secs / 3600) + 'h' + Math.floor((secs % 3600) / 60) + 'm';
          }
        } catch {
          detail = body.substring(0, 80);
        }
        if (detail) {
          logBox.log('    {gray-fg}' + detail + '{/gray-fg}');
        }
      }

      if (entryCount >= 10) {
        logBox.log('  {gray-fg}... (auto-polling every 10s){/gray-fg}');
      }
    } catch (e: any) {
      entryCount++;
      const ts = new Date().toLocaleTimeString();
      if (e.message?.includes('timeout') || e.name === 'TimeoutError') {
        logBox.log('{red-fg}\u25b6{/red-fg} [' + ts + '] Health check timed out (5s)');
      } else {
        logBox.log('{yellow-fg}\u25b6{/yellow-fg} [' + ts + '] Error: ' + (e.message || 'unknown'));
      }
    }
  }

  // Initial poll
  pollLogs();

  // Poll every 10 seconds
  const pollTimer = setInterval(pollLogs, 10000);

  // Clean up on destroy
  const origDestroy = logBox.destroy.bind(logBox);
  logBox.destroy = () => {
    clearInterval(pollTimer);
    origDestroy();
  };

  onReady(logBox);
}
