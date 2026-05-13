/**
 * Forge CLI — AI Query Engine
 *
 * Connects to the Forge MCP server and public API to answer
 * natural language queries about the Forge ecosystem.
 *
 * Two modes:
 *   1. Direct mode — queries MCP tools, returns structured data (no LLM)
 *   2. AI mode — uses Hermes proxy API for natural language responses
 */
import { config } from './configManager.js';
import { printError, spinner } from './output.js';

const API_BASE = 'https://forge.tekup.dk/api/forge';
const MCP_BASE = `http://127.0.0.1:${config.get().ports.mcp}`;
const HERMES_PROXY = 'https://forge.tekup.dk/api/hermes';

/** ─── MCP Tool Call ─── */

interface MCPResponse {
  jsonrpc: '2.0';
  id: number;
  result?: {
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  };
  error?: { code: number; message: string };
}

async function callMCP(tool: string, args: Record<string, any> = {}): Promise<any> {
  try {
    const res = await fetch(`${MCP_BASE}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: tool, arguments: args },
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`MCP HTTP ${res.status}`);
    const data: MCPResponse = await res.json();
    if (data.error) throw new Error(`MCP error: ${data.error.message}`);
    return data.result;
  } catch (e: any) {
    if (e.message?.includes('connect') || e.message?.includes('ECONNREFUSED')) {
      throw new Error('MCP server not running (try: forge mcp start)');
    }
    throw e;
  }
}

/** ─── Forge API Call ─── */

async function callAPI(path: string): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}

/** ─── Hermes AI Proxy ─── */

async function callHermesAI(query: string, context: string): Promise<string> {
  const res = await fetch(`${HERMES_PROXY}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'forge-assistant',
      messages: [
        { role: 'system', content: `You are the Forge CLI AI assistant. You help users understand the Hermes Forge platform.\n\nCurrent context:\n${context}` },
        { role: 'user', content: query },
      ],
      max_tokens: 1024,
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`AI proxy: ${res.status}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '(no response)';
}

/** ─── Context Gatherers ─── */

async function getSystemContext(): Promise<string> {
  const parts: string[] = [];

  try {
    const status = await callAPI('/v1/system/status');
    parts.push(`System Status: ${status.status || 'unknown'}`);
    parts.push(`Version: ${status.version || '?'}`);
    parts.push(`Uptime: ${status.uptime ? Math.floor(status.uptime / 3600) + 'h' : '?'}`);
  } catch { parts.push('System: unavailable'); }

  try {
    const packs = await callMCP('forge_list_packs', { limit: 5 });
    if (packs?.content?.[0]?.text) {
      const data = JSON.parse(packs.content[0].text);
      parts.push(`Packs: ${data.length || 0} available`);
    }
  } catch { parts.push('Packs: unavailable'); }

  try {
    const health = await fetch('https://forge.tekup.dk/api/health', { signal: AbortSignal.timeout(5000) });
    parts.push(`Web: ${health.ok ? 'online' : 'degraded'} (${health.status})`);
  } catch { parts.push('Web: unreachable'); }

  return parts.join('\n');
}

/** ─── Query Router ─── */

export interface QueryResult {
  answer: string;
  source: 'mcp' | 'api' | 'ai' | 'error';
}

const QUERY_ROUTES: Record<string, (query: string) => Promise<string>> = {
  packs: async (_q) => {
    const result = await callMCP('forge_list_packs', { limit: 20 });
    const raw = result?.content?.[0]?.text || '[]';
    const packs = JSON.parse(raw);
    if (!packs.length) return 'No packs found.';
    return packs.slice(0, 20).map((p: any, i: number) =>
      `${i + 1}. ${p.name || p.slug} — ${p.rarity_label || 'common'} (trust: ${p.trust_score || '?'})`
    ).join('\n');
  },

  leaderboard: async (_q) => {
    const result = await callMCP('forge_list_leaderboard');
    const raw = result?.content?.[0]?.text || '[]';
    const entries = JSON.parse(raw);
    if (!entries.length) return 'Leaderboard is empty.';
    return entries.slice(0, 10).map((e: any, i: number) =>
      `${i + 1}. ${e.name || e.pack_id} — ${e.trust_score || 0} trust`
    ).join('\n');
  },

  health: async (_q) => {
    const lines: string[] = [];
    try {
      const web = await fetch('https://forge.tekup.dk', { signal: AbortSignal.timeout(5000) });
      lines.push(`forge.tekup.dk: ${web.ok ? '✅ UP' : '❌ DOWN'} (${web.status})`);
    } catch { lines.push('forge.tekup.dk: ❌ UNREACHABLE'); }

    try {
      const api = await fetch('https://forge.tekup.dk/api/health', { signal: AbortSignal.timeout(5000) });
      const data = await api.json().catch(() => ({}));
      lines.push(`API: ${api.ok ? '✅ UP' : '❌ DOWN'} (${api.status})`);
      if (data.status) lines.push(`  Status: ${data.status}`);
      if (data.db) lines.push(`  DB: ${data.db}`);
      if (data.uptime) lines.push(`  Uptime: ${Math.floor(data.uptime / 3600)}h`);
    } catch { lines.push('API: ❌ UNREACHABLE'); }

    try {
      const mcp = await fetch(`${MCP_BASE}/health`, { signal: AbortSignal.timeout(3000) });
      const mcpData = await mcp.json().catch(() => ({}));
      lines.push(`MCP: ${mcp.ok ? '✅ UP' : '❌ DOWN'} (${mcp.status})`);
      if (mcpData.tools) lines.push(`  Tools: ${mcpData.tools} available`);
    } catch { lines.push('MCP: ❌ NOT RUNNING'); }

    return lines.join('\n');
  },

  system: async (_q) => {
    const data = await callAPI('/v1/system/status');
    return Object.entries(data).map(([k, v]) => `${k}: ${v}`).join('\n');
  },

  help: async (_q) => {
    return [
      'Available queries:',
      '',
      '  forge ask packs             — List available packs',
      '  forge ask leaderboard       — Top packs by trust score',
      '  forge ask health            — System health status',
      '  forge ask system            — Full system status',
      '  forge ask "anything else"   — Any question (uses AI mode)',
      '',
      '  forge suggest               — Full system analysis + recommendations',
      '  forge agent spawn <pack>    — Create agent from a pack',
      '  forge agent list            — List your agents',
    ].join('\n');
  },
};

/** ─── Main Query Function ─── */

export async function executeQuery(query: string, useAI: boolean = false): Promise<QueryResult> {
  const q = query.toLowerCase().trim();

  // Check for known structured queries
  for (const [key, handler] of Object.entries(QUERY_ROUTES)) {
    if (q.includes(key) && !useAI) {
      try {
        spinner.start(`Querying ${key}...`);
        const answer = await handler(q);
        spinner.stop();
        return { answer, source: key === 'help' ? 'api' : 'mcp' };
      } catch (e: any) {
        spinner.stop();
        return { answer: `Error: ${e.message}`, source: 'error' };
      }
    }
  }

  // Fallback: try AI mode
  if (useAI) {
    try {
      spinner.start('Thinking...');
      const context = await getSystemContext();
      const answer = await callHermesAI(query, context);
      spinner.stop();
      return { answer, source: 'ai' };
    } catch (e: any) {
      spinner.stop();
      return { answer: `AI unavailable: ${e.message}`, source: 'error' };
    }
  }

  // No match found
  return {
    answer: `I don't understand "${query}". Try "forge ask help" for available queries, or use --ai for natural language.`,
    source: 'error',
  };
}
