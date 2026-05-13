/**
 * Hermes Forge — Terminal User Interface (TUI)
 *
 * Full-screen TUI dashboard for monitoring and managing the Forge ecosystem.
 * Uses neo-blessed for terminal rendering with brand styling.
 * v2: Real-time pack sync, live log streaming, grafiske metrics
 */

import blessed from 'neo-blessed';
import { createDashboard } from './dashboard.js';
import { createPackBrowser } from './pack-browser.js';
import { createLiveLogs } from './live-logs.js';

const { widget } = blessed;

export interface TuiOptions {
  initialView?: 'dashboard' | 'packs' | 'health' | 'logs';
}

// ─── Refresh interval constants ───
const DASHBOARD_INTERVAL = 5000;  // 5s
const PACK_INTERVAL = 15000;      // 15s
const HEALTH_INTERVAL = 10000;    // 10s

/**
 * Launch the Hermes Forge TUI
 */
export function launchTUI(_options: TuiOptions = {}): void {
  const screen = new widget.Screen({
    smartCSR: true,
    title: 'Hermes Forge',
    dockBorders: true,
    fullUnicode: true,
    autoPadding: true,
    warnings: false,
  });

  // ─── Header bar ───
  new widget.Box({
    parent: screen,
    top: 0,
    left: 0,
    width: '100%',
    height: 3,
    style: { bg: 62, fg: 15 },
    content: '  \u2B21 FORGE  |  Terminal Dashboard  |  v1.0.0',
    tags: true,
  });

  // ─── Status bar (bottom) ───
  const statusBar = new widget.Box({
    parent: screen,
    bottom: 0,
    left: 0,
    width: '100%',
    height: 1,
    style: { bg: 236, fg: 250 },
    content: '  Tab/Arrows: Navigate  |  Enter: Select  |  q/Ctrl-C: Quit  |  forge.tekup.dk',
  });

  // ─── Tab bar ───
  const tabBar = new widget.Listbar({
    parent: screen,
    top: 2,
    left: 0,
    width: '100%',
    height: 1,
    style: {
      bg: 235,
      item: { fg: 248 },
      selected: { fg: 255, bg: 237 },
    },
    commands: [
      { text: ' Dashboard ', callback: () => showDashboard() },
      { text: ' Packs ', callback: () => showPacks() },
      { text: ' Health ', callback: () => showHealth() },
      { text: ' Logs ', callback: () => showLogs() },
    ],
  });

  // ─── Main content area ───
  const mainArea = new widget.Box({
    parent: screen,
    top: 3,
    left: 0,
    width: '100%',
    height: '100%-4',
    style: { bg: 234, fg: 255 },
  });

  // ─── Refresh timers ───
  let refreshTimers: NodeJS.Timeout[] = [];

  function clearTimers(): void {
    for (const t of refreshTimers) clearInterval(t);
    refreshTimers = [];
  }

  // ─── Views ───
  let currentView: any = null;

  function clearView(): void {
    clearTimers();
    if (currentView) {
      mainArea.remove(currentView);
      currentView.destroy();
      currentView = null;
    }
  }

  // ─── Set status bar message ───
  function setStatus(msg: string): void {
    statusBar.setContent('  ' + msg);
    screen.render();
  }

  // ─── Dashboard ───
  function showDashboard(): void {
    clearView();
    setStatus('Dashboard — Auto-refresh every ' + (DASHBOARD_INTERVAL / 1000) + 's');
    currentView = createDashboard(mainArea);

    // Auto-refresh
    const timer = setInterval(() => {
      if (currentView) {
        try {
          currentView.destroy();
        } catch { /* ignore */ }
        currentView = createDashboard(mainArea);
        screen.render();
      }
    }, DASHBOARD_INTERVAL);
    refreshTimers.push(timer);

    screen.render();
  }

  // ─── Pack Browser ───
  function showPacks(): void {
    clearView();
    setStatus('Pack Browser — Auto-refresh every ' + (PACK_INTERVAL / 1000) + 's | Shift+R: Force reload');
    createPackBrowser(mainArea, screen, (container) => {
      currentView = container;

      // Auto-refresh
      const timer = setInterval(() => {
        if (currentView) {
          try {
            currentView.destroy();
          } catch { /* ignore */ }
          createPackBrowser(mainArea, screen, (c) => { currentView = c; });
        }
      }, PACK_INTERVAL);
      refreshTimers.push(timer);

      screen.render();
    });
  }

  // ─── Health Monitor ───
  function showHealth(): void {
    clearView();
    setStatus('Health Monitor — Auto-refresh every ' + (HEALTH_INTERVAL / 1000) + 's');

    const healthLog = new widget.Log({
      parent: mainArea,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      label: ' Health Monitor (live) ',
      border: { type: 'line', fg: 62 },
      style: { fg: 248, bg: 234, border: { fg: 62 } },
      scrollback: 200,
      tags: true,
      scrollOnInput: true,
    });
    currentView = healthLog;

    // Initial check
    checkHealthAndLog(healthLog);

    // Auto-refresh
    const timer = setInterval(() => {
      checkHealthAndLog(healthLog);
      screen.render();
    }, HEALTH_INTERVAL);
    refreshTimers.push(timer);

    screen.render();
  }

  // ─── Live Logs ───
  function showLogs(): void {
    clearView();
    setStatus('Live Logs — Tail API logs');
    createLiveLogs(mainArea, (container) => {
      currentView = container;
      screen.render();
    });
  }

  // ─── Key bindings ───
  screen.key(['q', 'Q', 'C-c'], () => {
    clearTimers();
    screen.destroy();
    process.exit(0);
  });

  screen.key(['right', 'left'], (_ch: any, key: any) => {
    if (key.name === 'right') tabBar.moveRight();
    else tabBar.moveLeft();
    screen.render();
  });

  // Shift+R reload packs
  screen.key(['S-r'], () => {
    if (currentView) {
      showPacks();
    }
  });

  // ─── Start on dashboard ───
  showDashboard();
  screen.render();
}

/**
 * Run health checks and append results to the log widget
 */
async function checkHealthAndLog(log: any): Promise<void> {
  const results = [
    { name: 'forge.tekup.dk', url: 'https://forge.tekup.dk' },
    { name: 'API Health', url: 'https://forge.tekup.dk/api/health' },
  ];

  log.log('');
  log.log('{bold}' + new Date().toLocaleTimeString() + ' — Health Check{/bold}');

  for (const r of results) {
    try {
      const start = Date.now();
      const res = await fetch(r.url, { signal: AbortSignal.timeout(5000) });
      const ms = Date.now() - start;
      if (res.ok) {
        log.log('  {green-fg}\u2713{/green-fg} ' + r.name + ' \u2014 ' + ms + 'ms (200)');
      } else {
        log.log('  {red-fg}\u2717{/red-fg} ' + r.name + ' \u2014 ' + res.status);
      }
    } catch (e: any) {
      log.log('  {red-fg}\u2717{/red-fg} ' + r.name + ' \u2014 ' + (e.message || 'timeout'));
    }
  }
}
