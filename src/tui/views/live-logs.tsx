/**
 * Hermes Forge Ink TUI — Live Logs View
 *
 * Streams real-time logs from forge.tekup.dk API.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Box, Text } from 'ink';
import { COLORS } from '../../brand/colors.js';

// ─── Types ───

interface LogEntry {
  id: number;
  timestamp: string;
  message: string;
  level: 'info' | 'warn' | 'error' | 'debug';
}

// ─── Constants ───

const LOG_POLL_MS = 10000;
const MAX_LOG_ENTRIES = 100;

// ─── Live Logs Component ───

export function LiveLogs() {
  const [entries, setEntries] = useState<LogEntry[]>([
    { id: 0, timestamp: new Date().toLocaleTimeString(), message: 'Log viewer initialized', level: 'info' },
  ]);
  const nextId = useRef(1);
  const pollCount = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function pollLogs() {
      try {
        const res = await fetch('https://forge.tekup.dk/api/health', {
          signal: AbortSignal.timeout(5000),
        });

        pollCount.current++;
        const ts = new Date().toLocaleTimeString();
        const status = res.ok ? '200 OK' : `HTTP ${res.status}`;
        const level: LogEntry['level'] = res.ok ? 'info' : 'error';

        const entry: LogEntry = {
          id: nextId.current++,
          timestamp: ts,
          message: `[${ts}] /api/health \u2192 ${status}`,
          level,
        };

        if (!cancelled) {
          setEntries((prev: LogEntry[]) => {
            const next = [...prev, entry];

            // Parse body for more details
            if (res.ok) {
              res.clone().text().catch(() => '').then(body => {
                if (body && !cancelled) {
                  let detail = '';
                  try {
                    const parsed = JSON.parse(body);
                    if (parsed.status) detail = `status=${parsed.status}`;
                    if (parsed.db) detail += ` db=${parsed.db}`;
                    if (parsed.uptime) {
                      const secs = Math.floor(parsed.uptime);
                      detail += ` uptime=${Math.floor(secs / 3600)}h${Math.floor((secs % 3600) / 60)}m`;
                    }
                  } catch {
                    detail = body.substring(0, 80);
                  }
                  if (detail) {
                    setEntries((prev2: LogEntry[]) => {
                      const detailEntry: LogEntry = {
                        id: nextId.current++,
                        timestamp: ts,
                        message: `  ${detail}`,
                        level: 'debug',
                      };
                      return [...prev2, detailEntry];
                    });
                  }
                }
              });
            }

            if (pollCount.current >= 10) {
              const summaryEntry: LogEntry = {
                id: nextId.current++,
                timestamp: ts,
                message: '... (auto-polling every 10s)',
                level: 'debug',
              };
              next.push(summaryEntry);
            }

            if (next.length > MAX_LOG_ENTRIES) {
              return next.slice(next.length - MAX_LOG_ENTRIES);
            }
            return next;
          });
        }
      } catch (e: any) {
        if (cancelled) return;
        pollCount.current++;
        const ts = new Date().toLocaleTimeString();
        const errorMsg = e.message?.includes('timeout') || e.name === 'TimeoutError'
          ? `Health check timed out (5s)`
          : `Error: ${e.message || 'unknown'}`;

        setEntries((prev: LogEntry[]) => {
          const entry: LogEntry = {
            id: nextId.current++,
            timestamp: ts,
            message: `[${ts}] ${errorMsg}`,
            level: 'error',
          };
          const next = [...prev, entry];
          if (next.length > MAX_LOG_ENTRIES) return next.slice(next.length - MAX_LOG_ENTRIES);
          return next;
        });
      }
    }

    // Initial poll
    pollLogs();

    // Poll every 10 seconds
    const interval = setInterval(pollLogs, LOG_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Get colors for each level
  function levelColor(level: LogEntry['level']): string {
    switch (level) {
      case 'info': return COLORS.success;
      case 'warn': return COLORS.warning;
      case 'error': return COLORS.error;
      case 'debug': return COLORS.textMuted;
    }
  }

  function levelPrefix(level: LogEntry['level']): string {
    switch (level) {
      case 'info': return `\u25b6`;
      case 'warn': return '\u26a0';
      case 'error': return '\u2717';
      case 'debug': return ' ';
    }
  }

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
          {' '}Live Logs (auto-refresh){'\u00a0'}
        </Text>
        <Text color={COLORS.textMuted}>
          (polling every {LOG_POLL_MS / 1000}s)
        </Text>
      </Box>

      {/* Log entries */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={COLORS.primary}
        paddingLeft={1}
        paddingRight={1}
      >
        <Box marginBottom={1}>
          <Text bold color={COLORS.text}>Live Log Feed</Text>
        </Box>
        {entries.map((entry: LogEntry) => (
          <Box key={entry.id}>
            <Text color={levelColor(entry.level)}>
              {levelPrefix(entry.level)}
            </Text>
            {' '}
            <Text color={entry.level === 'debug' ? COLORS.textMuted : COLORS.text}>
              {entry.message}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
