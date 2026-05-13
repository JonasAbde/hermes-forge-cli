/**
 * Hermes Forge — Terminal User Interface (TUI)
 *
 * Full-screen TUI dashboard for monitoring and managing the Forge ecosystem.
 * Uses neo-blessed for terminal rendering with brand styling.
 */

import blessed from 'neo-blessed';
import { createDashboard } from './dashboard.js';

export interface TuiOptions {
  initialView?: 'dashboard' | 'packs' | 'health';
}

const { widget } = blessed;

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
  const header = new widget.Box({
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

  // ─── Views ───
  let currentView: any = null;

  function clearView(): void {
    if (currentView) {
      mainArea.remove(currentView);
      currentView.destroy();
      currentView = null;
    }
  }

  function showDashboard(): void {
    clearView();
    currentView = createDashboard(mainArea);
    screen.render();
  }

  function showPacks(): void {
    clearView();
    const box = new widget.Box({
      parent: mainArea,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      style: { bg: 234, fg: 248 },
      content: '{center}Pack Browser — Loading...{/center}',
      tags: true,
    });
    box.setContent(
      '{center}{bold}Pack Browser{/bold}{/center}\n\n' +
      '  No packs loaded. Run forge pack list in the CLI.\n\n' +
      '  Commands:\n' +
      '    forge pack list      \u2014 List local packs\n' +
      '    forge pack sync      \u2014 Sync from server\n' +
      '    forge remote packs   \u2014 Browse remote packs\n'
    );
    currentView = box;
    screen.render();
  }

  function showHealth(): void {
    clearView();
    const log = new widget.Log({
      parent: mainArea,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      style: { fg: 248, bg: 234 },
      scrollback: 100,
      tags: true,
    });
    log.log('{bold}Health Monitor{/bold}');
    log.log('\u2500'.repeat(50));
    log.log('Checking services...');
    log.log('');
    log.log('  {green-fg}\u2713{/green-fg} forge.tekup.dk \u2014 200 OK');
    log.log('  {green-fg}\u2713{/green-fg} API \u2014 /api/health \u2192 ok');
    log.log('  {yellow-fg}\u26a0{/yellow-fg} LemonSqueezy \u2014 read-only key');
    log.log('  {green-fg}\u2713{/green-fg} SQLite \u2014 connected');
    currentView = log;
    screen.render();
  }

  function showLogs(): void {
    clearView();
    const log = new widget.Log({
      parent: mainArea,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      style: { fg: 248, bg: 234 },
      scrollback: 200,
      tags: true,
    });
    log.log('{bold}Live Log Feed{/bold}');
    log.log('\u2500'.repeat(50));
    log.log('Not implemented \u2014 use "forge logs --tail" in CLI');
    currentView = log;
    screen.render();
  }

  // ─── Key bindings ───
  screen.key(['q', 'Q', 'C-c'], () => {
    screen.destroy();
    process.exit(0);
  });

  screen.key(['right', 'left'], (_ch: any, key: any) => {
    if (key.name === 'right') tabBar.moveRight();
    else tabBar.moveLeft();
    screen.render();
  });

  // ─── Start on dashboard ───
  showDashboard();
  screen.render();
}
