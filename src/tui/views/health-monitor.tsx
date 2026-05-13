/**
 * Hermes Forge Ink TUI — Health Monitor View
 *
 * Shows live health check results for forge services.
 */

import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { COLORS } from '../../brand/colors.js';

// ─── Types ───

interface HealthEntry {
  timestamp: string;
  checks: HealthCheckResult[];
}

interface HealthCheckResult {
  name: string;
  url: string;
  status: 'pass' | 'fail';
  detail: string;
  ms: number;
}

// ─── Constants ───

const HEALTH_REFRESH_MS = 10000;
const MAX_ENTRIES = 20;

const CHECK_TARGETS: { name: string; url: string }[] = [
  { name: 'forge.tekup.dk', url: 'https://forge.tekup.dk' },
  { name: 'API Health', url: 'https://forge.tekup.dk/api/health' },
];

// ─── Health Monitor Component ───

export function HealthMonitor() {
  const [entries, setEntries] = useState<HealthEntry[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function runChecks() {
      const timestamp = new Date().toLocaleTimeString();
      const checks: HealthCheckResult[] = [];

      for (const target of CHECK_TARGETS) {
        try {
          const start = Date.now();
          const res = await fetch(target.url, { signal: AbortSignal.timeout(5000) });
          const ms = Date.now() - start;
          if (res.ok) {
            checks.push({
              name: target.name,
              url: target.url,
              status: 'pass',
              detail: `${ms}ms (${res.status})`,
              ms,
            });
          } else {
            checks.push({
              name: target.name,
              url: target.url,
              status: 'fail',
              detail: `${res.status} — ${res.statusText}`,
              ms,
            });
          }
        } catch (e: any) {
          checks.push({
            name: target.name,
            url: target.url,
            status: 'fail',
            detail: e.message || 'timeout',
            ms: 0,
          });
        }
      }

      if (!cancelled) {
        setEntries((prev: HealthEntry[]) => {
          const next = [...prev, { timestamp, checks }];
          if (next.length > MAX_ENTRIES) return next.slice(next.length - MAX_ENTRIES);
          return next;
        });
      }
    }

    // Initial run
    runChecks();

    // Auto-refresh
    const interval = setInterval(runChecks, HEALTH_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <Box flexDirection="column" paddingLeft={1} paddingRight={1}>
      {/* Header */}
      <Box
        borderStyle="round"
        borderColor={COLORS.primary}
        paddingLeft={1}
        paddingRight={1}
        marginBottom={1}
      >
        <Text bold color={COLORS.text}>
          {' '}Health Monitor (live){'\u00a0'}
        </Text>
        <Text color={COLORS.textMuted}>
          (auto-refresh every {HEALTH_REFRESH_MS / 1000}s)
        </Text>
      </Box>

      {/* Current status summary */}
      {entries.length > 0 && (
        <Box marginBottom={1}>
          {(() => {
            const latest = entries[entries.length - 1];
            const allPass = latest.checks.every((c: HealthCheckResult) => c.status === 'pass');
            const allFail = latest.checks.every((c: HealthCheckResult) => c.status === 'fail');
            return (
              <Text>
                <Text bold color={COLORS.text}>Live Status: </Text>
                {allPass ? (
                  <Text color={COLORS.success}>All checks passing</Text>
                ) : allFail ? (
                  <Text color={COLORS.error}>All checks failing</Text>
                ) : (
                  <Text color={COLORS.warning}>Partial outage detected</Text>
                )}
                <Text color={COLORS.textMuted}> — {latest.timestamp}</Text>
              </Text>
            );
          })()}
        </Box>
      )}

      {/* Latest check details */}
      {entries.length > 0 && (
        <Box
          borderStyle="round"
          borderColor={COLORS.primary}
          paddingLeft={1}
          paddingRight={1}
          marginBottom={1}
        >
          <Box flexDirection="column" width="100%">
            {entries[entries.length - 1].checks.map((check: HealthCheckResult, i: number) => (
              <Box key={i}>
                <Text>
                  {check.status === 'pass' ? (
                    <Text color={COLORS.success}>{'\u2713'}</Text>
                  ) : (
                    <Text color={COLORS.error}>{'\u2717'}</Text>
                  )}
                  {'  '}
                  <Text color={COLORS.text}>{check.name}</Text>
                  {' — '}
                  <Text color={check.status === 'pass' ? COLORS.success : COLORS.error}>
                    {check.detail}
                  </Text>
                </Text>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* History */}
      {entries.length === 0 ? (
        <Box>
          <Text color={COLORS.warning}>Running initial health checks...</Text>
        </Box>
      ) : (
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={COLORS.primary}
          paddingLeft={1}
          paddingRight={1}
        >
          <Box marginBottom={1}>
            <Text bold color={COLORS.text}>Check History</Text>
          </Box>
          {[...entries].reverse().slice(0, 10).map((entry: HealthEntry, ei: number) => (
            <Box key={ei} flexDirection="column">
              <Box>
                <Text bold color={COLORS.textDim}>{entry.timestamp}</Text>
              </Box>
              {entry.checks.map((check: HealthCheckResult, ci: number) => (
                <Box key={ci} paddingLeft={2}>
                  <Text>
                    {check.status === 'pass' ? (
                      <Text color={COLORS.success}>{'\u2713'}</Text>
                    ) : (
                      <Text color={COLORS.error}>{'\u2717'}</Text>
                    )}
                    {' '}{check.name} — {check.detail}
                  </Text>
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
