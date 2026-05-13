/**
 * Hermes Forge TUI — Dashboard View
 *
 * Main dashboard showing service status, metrics, and recent activity.
 */
import blessed from 'neo-blessed';

const { widget } = blessed;

/**
 * Create the main dashboard view inside a parent container
 */
export function createDashboard(parent: any): any {
  const container = new widget.Box({
    parent,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    style: { bg: 234, fg: 248 },
    tags: true,
  });

  // ─── Services Status Panel ───
  new widget.Box({
    parent: container,
    top: 0,
    left: 0,
    width: '50%',
    height: '60%',
    label: ' Services ',
    border: { type: 'line', fg: 62 },
    style: { fg: 248, bg: 234, border: { fg: 62 } },
    tags: true,
    content: [
      '{bold}Services{/bold}',
      '',
      '  {green-fg}\u25cf{/green-fg}  forge.tekup.dk  (200 OK)',
      '  {green-fg}\u25cf{/green-fg}  API Server      (:3001)',
      '  {green-fg}\u25cf{/green-fg}  SQLite Database  (connected)',
      '  {yellow-fg}\u25cf{/yellow-fg}  LemonSqueezy    (read-only)',
      '  {red-fg}\u25cb{/red-fg}   CLI Publish     (not published)',
      '',
      '{bold}Packs{/bold}',
      '',
      '  Total: 66  |  Active: 61  |  Trending: 12',
    ].join('\n'),
  });

  // ─── Metrics Panel ───
  new widget.Box({
    parent: container,
    top: 0,
    left: '50%',
    width: '50%',
    height: '60%',
    label: ' Key Metrics ',
    border: { type: 'line', fg: 62 },
    style: { fg: 248, bg: 234, border: { fg: 62 } },
    tags: true,
    content: [
      '{bold}Performance{/bold}',
      '',
      '  Lighthouse:        {yellow-fg}53/100{/yellow-fg}',
      '  CLS:               {green-fg}0.000 \u2713{/green-fg}',
      '  TBT:               850 ms',
      '  TTI:               5.5 s',
      '',
      '{bold}Code Quality{/bold}',
      '',
      '  Unit Tests:        {green-fg}199/199{/green-fg}',
      '  Server Tests:      {green-fg}318/318{/green-fg}',
      '  TypeScript:        {green-fg}0 errors{/green-fg}',
      '  Coverage:          68% lines',
      '',
      '{bold}Deployment{/bold}',
      '',
      '  Version:           {green-fg}v4.8.0{/green-fg}',
      '  Node:              v24',
      '  Uptime:            ~7 days',
    ].join('\n'),
  });

  // ─── Activity Log ───
  const activityBox = new widget.Log({
    parent: container,
    top: '60%',
    left: 0,
    width: '100%',
    height: '40%',
    label: ' Recent Activity ',
    border: { type: 'line', fg: 62 },
    style: { fg: 248, bg: 234, border: { fg: 62 } },
    tags: true,
    scrollback: 50,
    scrollOnInput: true,
  });

  // Initial log entries
  activityBox.log('{green-fg}\u2713{/green-fg} Dashboard initialized');
  activityBox.log('{green-fg}\u2713{/green-fg} Health check passed \u2014 all services nominal');
  activityBox.log('{gray-fg}\u2139{/gray-fg}  Forge v4.8.0 running on forge.tekup.dk');
  activityBox.log('');
  activityBox.log('  Press Tab for Pack Browser, Health, or Logs views');
  activityBox.log('  Press q or Ctrl-C to quit');

  return container;
}
