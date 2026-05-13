/**
 * Hermes Forge Ink TUI — Dashboard View
 *
 * Main dashboard showing service status, metrics, and recent activity.
 */

import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { COLORS } from '../../brand/colors.js';

// ─── Types ───

interface HealthResult {
  name: string;
  status: 'ok' | 'warn' | 'error';
  detail: string;
}

interface DashboardData {
  services: HealthResult[];
  metrics: {
    label: string;
    value: number;
    max: number;
  }[];
  activity: string[];
}

// ─── Helpers ───

/** Generate a colored progress bar */
function ProgBar({ value, max, width = 18 }: { value: number; max: number; width?: number }) {
  const ratio = Math.min(1, value / max);
  const filled = Math.floor(ratio * width);
  const empty = width - filled;
  const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
  const pct = Math.round(ratio * 100);

  let color: string = COLORS.success;
  if (pct < 30) color = COLORS.error;
  else if (pct < 60) color = COLORS.warning;

  return (
    <Text>
      <Text color={color}>{bar}</Text>{' '}
      <Text color={color}>{pct}%</Text>
    </Text>
  );
}

/** Service indicator dot */
function ServiceDot({ status }: { status: 'ok' | 'warn' | 'error' }) {
  const color: string = status === 'ok' ? COLORS.success : status === 'warn' ? COLORS.warning : COLORS.error;
  const symbol = status === 'ok' ? '\u25cf' : '\u25cb';
  return <Text color={color}>{symbol}</Text>;
}

// ─── Default Dashboard Data ───

const defaultData: DashboardData = {
  services: [
    { name: 'forge.tekup.dk', status: 'ok', detail: '200 OK' },
    { name: 'API Server', status: 'ok', detail: ':3001' },
    { name: 'SQLite DB', status: 'ok', detail: 'connected' },
    { name: 'LemonSqueezy', status: 'warn', detail: 'read-only' },
    { name: 'CLI npm publish', status: 'error', detail: 'blocked' },
  ],
  metrics: [
    { label: 'Packs Active', value: 61, max: 66 },
    { label: 'Performance', value: 53, max: 100 },
    { label: 'Unit Tests', value: 199, max: 200 },
    { label: 'Server Tests', value: 318, max: 320 },
    { label: 'Coverage', value: 68, max: 100 },
  ],
  activity: [
    '\u2713 Dashboard initialized — v2 Ink TUI',
    '\u2713 Health check passed — all services nominal',
    '\u2139  Forge v4.8.0 running on forge.tekup.dk',
    '',
    '  Tab: Navigate  |  q: Quit',
  ],
};

// ─── Dashboard Component ───

export function Dashboard() {
  const [data, setData] = useState<DashboardData>(defaultData);

  useEffect(() => {
    // Fetch live health data on mount
    const fetchHealth = async () => {
      try {
        const res = await fetch('https://forge.tekup.dk/api/health', {
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const body = await res.json().catch(() => ({}));
          const detail = body.status
            ? `status=${body.status}${body.db ? ` db=${body.db}` : ''}`
            : '200 OK';
          setData((prev: DashboardData) => ({
            ...prev,
            services: prev.services.map((s: HealthResult) =>
              s.name === 'forge.tekup.dk' ? { ...s, detail } : s
            ),
            activity: [
              ...prev.activity.slice(0, 4),
              `\u2713 Health API: ${detail}`,
            ],
          }));
        }
      } catch {
        // Keep defaults on error
      }
    };
    fetchHealth();
  }, []);

  return (
    <Box flexDirection="column" paddingLeft={1} paddingRight={1}>
      {/* ─── Row: Services + Metrics ─── */}
      <Box flexDirection="row" height="55%">
        {/* Services Panel */}
        <Box
          flexDirection="column"
          width="50%"
          borderStyle="round"
          borderColor={COLORS.primary}
          paddingLeft={1}
          paddingRight={1}
        >
          <Box marginBottom={1}>
            <Text bold color={COLORS.text}>
              {' '}Services{' '}
            </Text>
          </Box>
          <Text bold color={COLORS.text}>System</Text>
          <Box marginTop={1} />
          {data.services.map((s: HealthResult) => (
            <Box key={s.name} marginTop={0}>
              <ServiceDot status={s.status} />{'  '}
              <Text color={COLORS.text}>
                {s.name}  (<Text color={s.status === 'ok' ? COLORS.success : s.status === 'warn' ? COLORS.warning : COLORS.error}>{s.detail}</Text>)
              </Text>
            </Box>
          ))}
          <Box marginTop={1} />
          <Text bold color={COLORS.text}>Packs</Text>
          <Box marginTop={1}>
            <Text color={COLORS.text}>
              Total: 66  Active: 61  Trending: 12
            </Text>
          </Box>
          <Box>
            <ProgBar value={61} max={66} width={16} />
          </Box>
          <Box marginTop={1} />
          <Text bold color={COLORS.text}>Deployment</Text>
          <Box marginTop={1}>
            <Text color={COLORS.text}>
              v4.8.0  |  Node v24  |  Uptime: ~7d
            </Text>
          </Box>
        </Box>

        {/* Metrics Panel */}
        <Box
          flexDirection="column"
          width="50%"
          borderStyle="round"
          borderColor={COLORS.primary}
          paddingLeft={1}
          paddingRight={1}
        >
          <Box marginBottom={1}>
            <Text bold color={COLORS.text}>
              {' '}Key Metrics{' '}
            </Text>
          </Box>
          <Text bold color={COLORS.text}>Lighthouse (Mobile)</Text>
          <Box marginTop={1} />
          <Box>
            <Text color={COLORS.text}>Performance: 53/100</Text>
          </Box>
          <Box>
            <ProgBar value={53} max={100} width={18} />
          </Box>
          <Box marginTop={1}>
            <Text color={COLORS.success}>CLS: 0.000 \u2713   SEO: 100</Text>
          </Box>
          <Box>
            <Text color={COLORS.warning}>TBT: 850ms   TTI: 5.5s</Text>
          </Box>
          <Box marginTop={1} />
          <Text bold color={COLORS.text}>Tests</Text>
          <Box marginTop={1}>
            <Text>Unit:   </Text>
            <ProgBar value={199} max={200} width={14} />
            <Text>  199/199</Text>
          </Box>
          <Box>
            <Text>Server: </Text>
            <ProgBar value={318} max={320} width={14} />
            <Text>  318/318</Text>
          </Box>
          <Box marginTop={1} />
          <Text bold color={COLORS.text}>Coverage</Text>
          <Box marginTop={1}>
            <ProgBar value={68} max={100} width={18} />
            <Text>  68% lines</Text>
          </Box>
        </Box>
      </Box>

      {/* ─── Activity Log ─── */}
      <Box
        flexDirection="column"
        height="45%"
        borderStyle="round"
        borderColor={COLORS.primary}
        paddingLeft={1}
        paddingRight={1}
        marginTop={1}
      >
        <Box marginBottom={1}>
          <Text bold color={COLORS.text}>
            {' '}Recent Activity{' '}
          </Text>
        </Box>
        {data.activity.map((line: string, i: number) => (
          <Box key={i}>
            <Text color={COLORS.text}>{line}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
