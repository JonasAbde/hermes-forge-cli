/**
 * Hermes Forge Ink TUI — Pack Browser View
 *
 * Displays remote packs from forge.tekup.dk with auto-refresh.
 */

import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { COLORS } from '../../brand/colors.js';

// ─── Types ───

interface PackItem {
  id: string;
  name: string;
  slug: string;
  rarity?: string;
  status?: string;
  trust_score?: number;
  install_count?: number;
}

// ─── Constants ───

const API_BASE = 'https://forge.tekup.dk/api';
const PACK_REFRESH_MS = 15000;

// ─── Helpers ───

function rarityColor(rarity: string | undefined): string {
  switch ((rarity || '').toLowerCase()) {
    case 'legendary': return '#eab308';
    case 'epic': return '#d946ef';
    case 'rare': return '#06b6d4';
    case 'uncommon': return '#10b981';
    default: return '#f9fafb';
  }
}

function rarityLabel(rarity?: string): string {
  return rarity ? `[${rarity}]` : '';
}

// ─── API fetch ───

async function fetchPacks(): Promise<PackItem[]> {
  try {
    const res = await fetch(`${API_BASE}/packs`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data.packs || data || []).map((p: any) => ({
      id: p.pack_id || p.id,
      name: p.name || p.slug || 'unknown',
      slug: p.slug || '',
      rarity: p.rarity_tier || p.rarity || 'common',
      status: p.status || 'unknown',
      trust_score: p.trust_score ?? 0,
      install_count: p.install_count ?? 0,
    }));
  } catch {
    // Fallback to marketplace endpoint
    try {
      const res = await fetch(`${API_BASE}/marketplace/packs`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return (data.packs || data || []).map((p: any) => ({
        id: p.pack_id || p.id,
        name: p.name || p.slug || 'unknown',
        slug: p.slug || '',
        rarity: p.rarity_tier || p.rarity || 'common',
        status: p.status || 'unknown',
        trust_score: p.trust_score ?? 0,
        install_count: p.install_count ?? 0,
      }));
    } catch {
      return [];
    }
  }
}

// ─── Pack Browser Component ───

export function PackBrowser({ forceReload }: { forceReload: number }) {
  const [packs, setPacks] = useState<PackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    let cancelled = false;

    async function loadPacks() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchPacks();
        if (!cancelled) {
          setPacks(result);
          setLastUpdate(new Date());
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || 'Failed to load packs');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPacks();

    // Auto-refresh
    const interval = setInterval(loadPacks, PACK_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [forceReload]);

  const activeCount = packs.filter((p: PackItem) => p.status === 'active' || !p.status).length;
  const displayPacks = packs.slice(0, 30);

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
        <Box flexDirection="column" width="100%">
          <Box>
            <Text bold color={COLORS.text}>
              {' '}Pack Browser{'\u00a0'}
            </Text>
            <Text color={COLORS.textMuted}>
              (auto-refresh every {PACK_REFRESH_MS / 1000}s | Shift+R: Force reload)
            </Text>
          </Box>
          {loading ? (
            <Text color={COLORS.warning}>Loading packs...</Text>
          ) : packs.length > 0 ? (
            <Text>
              <Text bold>Total: {packs.length} packs</Text>
              {' | '}
              <Text>Active: {activeCount}</Text>
              {' | '}
              <Text color={COLORS.textMuted}>Updated: {lastUpdate.toLocaleTimeString()}</Text>
            </Text>
          ) : error ? (
            <Text color={COLORS.error}>Error: {error}</Text>
          ) : (
            <Text color={COLORS.warning}>No packs found</Text>
          )}
        </Box>
      </Box>

      {/* Pack List */}
      <Box flexDirection="column">
        {error && packs.length === 0 ? (
          <Box>
            <Text color={COLORS.error}>{'\u26a0'} {error}</Text>
          </Box>
        ) : displayPacks.length === 0 && !loading ? (
          <Box>
            <Text color={COLORS.warning}>{'\u26a0'} API returned no packs</Text>
            <Text color={COLORS.textMuted}>Check: forge remote packs (CLI)</Text>
          </Box>
        ) : (
          displayPacks.map((p: PackItem) => {
            const stars = '\u2605'.repeat(Math.min(5, Math.floor(((p.trust_score || 0) / 10) + 1)));
            const rColor = rarityColor(p.rarity);
            return (
              <Box key={p.id} flexDirection="column" marginBottom={0}>
                <Box>
                  {p.rarity && (
                    <Text color={rColor}>{rarityLabel(p.rarity)} </Text>
                  )}
                  <Text bold color={COLORS.text}>{p.name}</Text>
                </Box>
                <Box paddingLeft={2}>
                  <Text color={COLORS.textMuted}>
                    {p.slug || p.id} | {stars} | {p.install_count || 0} installs
                  </Text>
                </Box>
              </Box>
            );
          })
        )}
        {packs.length > 30 && (
          <Box marginTop={1}>
            <Text color={COLORS.textMuted}>
              ... and {packs.length - 30} more (total: {packs.length})
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
