/**
 * Hermes Forge TUI — Pack Browser
 *
 * Displays remote packs from forge.tekup.dk with auto-refresh.
 */
import blessed from 'neo-blessed';

const { widget } = blessed;
const API_BASE = 'https://forge.tekup.dk/api';

interface PackItem {
  id: string;
  name: string;
  slug: string;
  rarity?: string;
  status?: string;
  trust_score?: number;
  install_count?: number;
}

/**
 * Create the pack browser view
 */
export function createPackBrowser(parent: any, screen: any, onReady: (container: any) => void): void {
  const container = new widget.Box({
    parent,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    style: { bg: 234, fg: 248 },
    tags: true,
  });

  // ─── Loading indicator ───
  const loading = new widget.Box({
    parent: container,
    top: 'center',
    left: 'center',
    width: 30,
    height: 3,
    style: { bg: 234, fg: 248 },
    content: '{center}{yellow-fg}Loading packs...{/yellow-fg}{/center}',
    tags: true,
  });
  screen.render();

  // ─── Fetch packs ───
  fetchPacks()
    .then(packs => {
      loading.destroy();
      renderPackList(container, screen, parent, onReady, packs);
    })
    .catch(err => {
      loading.setContent('{center}{red-fg}Error: ' + (err.message || 'unknown') + '{/red-fg}{/center}');
      screen.render();
    });
}

async function fetchPacks(): Promise<PackItem[]> {
  try {
    const res = await fetch(API_BASE + '/packs', { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
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
    // Fallback: try marketplace endpoint
    try {
      const res = await fetch(API_BASE + '/marketplace/packs', { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
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

function rarityColor(rarity: string | undefined): string {
  switch ((rarity || '').toLowerCase()) {
    case 'legendary': return 'yellow';
    case 'epic': return 'magenta';
    case 'rare': return 'cyan';
    case 'uncommon': return 'green';
    default: return 'white';
  }
}

function renderPackList(
  container: any,
  screen: any,
  parent: any,
  onReady: (c: any) => void,
  packs: PackItem[]
): void {
  container.destroy();

  const summary = packs.length > 0
    ? '{bold}Total: ' + packs.length + ' packs | '
    + 'Active: ' + packs.filter(p => p.status === 'active' || !p.status).length
    + '{/bold}'
    : '{bold}No packs found{/bold}';

  const listBox = new widget.Box({
    parent,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    style: { bg: 234, fg: 248 },
    tags: true,
    content: '',
  });

  // Build content
  const lines: string[] = [];
  lines.push('');
  lines.push('  ' + summary);
  lines.push('  \u2500'.repeat(50));

  if (packs.length === 0) {
    lines.push('');
    lines.push('  {yellow-fg}\u26a0 API returned no packs{/yellow-fg}');
    lines.push('  Check: forge remote packs (CLI)');
  } else {
    // Limit to top N for display
    const displayPacks = packs.slice(0, 30);
    for (const p of displayPacks) {
      const star = '★'.repeat(Math.min(5, Math.floor(((p.trust_score || 0) / 10) + 1)));
      const color = rarityColor(p.rarity);
      const rarityTag = p.rarity
        ? '{' + color + '-fg}[' + p.rarity + ']{/' + color + '-fg} '
        : '';
      lines.push('  ' + rarityTag + '{bold}' + p.name + '{/bold}');
      lines.push('    {gray-fg}' + (p.slug || p.id) + ' | ' + star + ' | ' + (p.install_count || 0) + ' installs{/gray-fg}');
    }
    if (packs.length > 30) {
      lines.push('');
      lines.push('  {gray-fg}... and ' + (packs.length - 30) + ' more (total: ' + packs.length + '){/gray-fg}');
    }
  }

  listBox.setContent(lines.join('\n'));
  onReady(listBox);
}
