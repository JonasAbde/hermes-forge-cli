/**
 * Hermes Forge — Ink-based Terminal User Interface (TUI)
 *
 * Replaces neo-blessed with React + Ink for terminal rendering.
 * Provides Dashboard, Packs, Health, and Logs views with keyboard navigation.
 */

import React, { useState } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import { COLORS } from '../brand/colors.js';
import { Dashboard } from './views/dashboard.js';
import { PackBrowser } from './views/pack-browser.js';
import { HealthMonitor } from './views/health-monitor.js';
import { LiveLogs } from './views/live-logs.js';

// ─── Types ───

type ViewName = 'dashboard' | 'packs' | 'health' | 'logs';

interface TuiOptions {
  initialView?: ViewName;
}

interface ViewTab {
  name: ViewName;
  label: string;
}

// ─── Tab Definitions ───

const VIEW_TABS: ViewTab[] = [
  { name: 'dashboard', label: ' Dashboard ' },
  { name: 'packs', label: ' Packs ' },
  { name: 'health', label: ' Health ' },
  { name: 'logs', label: ' Logs ' },
];

// ─── TUI App Component ───

function TuiApp({ initialView = 'dashboard' }: TuiOptions) {
  const [activeView, setActiveView] = useState<ViewName>(initialView);
  const [packReload, setPackReload] = useState<number>(0);
  const { exit } = useApp();

  // ─── Keyboard handling ───
  useInput((input: string, key: { tab?: boolean; ctrl?: boolean; rightArrow?: boolean; leftArrow?: boolean }) => {
    // Quit: q, Q, Ctrl-C
    if (input === 'q' || input === 'Q' || (key.ctrl === true && input === 'c')) {
      exit();
      process.exit(0);
    }

    // Tab navigation: Tab, right arrow
    if (key.tab || input === '\t' || key.rightArrow) {
      const currentIdx = VIEW_TABS.findIndex((t: ViewTab) => t.name === activeView);
      const nextIdx = (currentIdx + 1) % VIEW_TABS.length;
      setActiveView(VIEW_TABS[nextIdx].name);
    }

    // Left arrow navigation
    if (key.leftArrow) {
      const currentIdx = VIEW_TABS.findIndex((t: ViewTab) => t.name === activeView);
      const prevIdx = (currentIdx - 1 + VIEW_TABS.length) % VIEW_TABS.length;
      setActiveView(VIEW_TABS[prevIdx].name);
    }

    // Shift+R to force reload packs
    if (input === 'R') {
      setPackReload((prev: number) => prev + 1);
    }
  });

  // ─── Status bar message ───
  const statusMessage: string = (() => {
    switch (activeView) {
      case 'dashboard': return 'Dashboard — Auto-refresh every 5s';
      case 'packs': return 'Pack Browser — Auto-refresh every 15s | Shift+R: Force reload';
      case 'health': return 'Health Monitor — Auto-refresh every 10s';
      case 'logs': return 'Live Logs — Tail API logs';
    }
  })();

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {/* ─── Header bar ─── */}
      <Box
        height={2}
        backgroundColor={COLORS.primary}
        paddingLeft={2}
        alignItems="center"
      >
        <Text bold color="#ffffff">
          {'  \u2b21 FORGE  |  Terminal Dashboard  |  v1.0.0'}
        </Text>
      </Box>

      {/* ─── Tab bar ─── */}
      <Box
        height={1}
        backgroundColor="#303030"
        paddingLeft={1}
      >
        {VIEW_TABS.map((tab: ViewTab) => (
          <Box
            key={tab.name}
            paddingLeft={1}
            paddingRight={1}
          >
            <Text
              bold={activeView === tab.name}
              color={activeView === tab.name ? '#ffffff' : '#bcbcbc'}
              backgroundColor={activeView === tab.name ? '#4a4a4a' : undefined}
            >
              {tab.label}
            </Text>
          </Box>
        ))}
      </Box>

      {/* ─── Main content ─── */}
      <Box
        flexGrow={1}
        backgroundColor="#1a1a1a"
      >
        {activeView === 'dashboard' && <Dashboard />}
        {activeView === 'packs' && <PackBrowser forceReload={packReload} />}
        {activeView === 'health' && <HealthMonitor />}
        {activeView === 'logs' && <LiveLogs />}
      </Box>

      {/* ─── Status bar ─── */}
      <Box
        height={1}
        backgroundColor="#303030"
        paddingLeft={2}
        alignItems="center"
      >
        <Text color="#bcbcbc">
          {'  '}{statusMessage}{'  |  Tab/Arrows: Navigate  |  Enter: Select  |  q/Ctrl-C: Quit  |  forge.tekup.dk'}
        </Text>
      </Box>
    </Box>
  );
}

// ─── Launch function ───

/**
 * Launch the Hermes Forge Ink TUI
 */
export function launchTUI(options: TuiOptions = {}): void {
  const { waitUntilExit } = render(<TuiApp initialView={options.initialView} />);

  // Keep the process alive until user quits
  waitUntilExit().then(() => {
    process.exit(0);
  });
}
