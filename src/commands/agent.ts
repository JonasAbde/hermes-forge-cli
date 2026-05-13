import { Command } from 'commander';
import { printHeader, printSuccess, printError, printInfo, printKV, printSection, printPanel } from '../lib/output.js';
import chalk from 'chalk';

const API_BASE = 'https://forge.tekup.dk/api/forge';

const program = new Command('agent')
  .description('Manage Forge agents')
  .alias('agents');

// ── list ────────────────────────────────────────────────────────

program
  .command('list')
  .description('List your agents')
  .option('--json', 'Output as JSON')
  .action(async (opts: { json?: boolean }) => {
    printHeader('Forge Agents');

    try {
      const res = await fetch(`${API_BASE}/v1/agents`, {
        signal: AbortSignal.timeout(8000),
        credentials: 'include',
      });

      if (res.status === 401) {
        printError('Not authenticated. Run: forge remote login');
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const agents = await res.json();
      const list = Array.isArray(agents) ? agents : agents.agents || [];

      if (opts.json) {
        console.log(JSON.stringify(list, null, 2));
        return;
      }

      if (list.length === 0) {
        printInfo('No agents found. Open a pack to create one: forge remote packs');
        return;
      }

      printInfo(`${list.length} agent(s)`);
      console.log('');

      for (const a of list) {
        const level = a.level || a.xp_level || 1;
        const xp = a.xp || 0;
        const rarity = a.rarity_label || a.rarity_tier || 'common';
        const color = rarity === 'legendary' ? chalk.yellow
          : rarity === 'epic' ? chalk.magenta
          : rarity === 'rare' ? chalk.cyan
          : chalk.white;

        printKV(a.name || a.id || 'Unknown', color(`${rarity} · lv.${level} · ${xp} XP`));
      }
    } catch (e: any) {
      if (e.message?.includes('fetch')) {
        printError(`API unreachable: ${e.message}`);
      } else {
        printError(`Failed to list agents: ${e.message}`);
      }
    }
  });

// ── spawn ───────────────────────────────────────────────────────

program
  .command('spawn <pack-id>')
  .description('Create/spawn an agent from a pack')
  .option('--json', 'Output as JSON')
  .action(async (packId: string, opts: { json?: boolean }) => {
    printHeader('Spawn Agent');
    printInfo(`Opening pack: ${packId}...`);

    try {
      const res = await fetch(`${API_BASE}/v1/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack_id: packId }),
        credentials: 'include',
        signal: AbortSignal.timeout(15000),
      });

      if (res.status === 401) {
        printError('Not authenticated. Run: forge remote login');
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        printError(`Failed: ${data.error || data.message || `HTTP ${res.status}`}`);
        return;
      }

      const agent = data.agent || data;

      if (opts.json) {
        console.log(JSON.stringify(agent, null, 2));
        return;
      }

      console.log('');
      const lines = [
        `Name: ${agent.name || agent.id || 'Agent'}`,
        `Rarity: ${agent.rarity_label || agent.rarity_tier || '?'}`,
        `Level: ${agent.level || agent.xp_level || 1}`,
        `XP: ${agent.xp || 0}`,
      ];
      printPanel(lines, { title: 'Agent Spawned ✨' });

      printSuccess('Agent created! View on forge.tekup.dk');
    } catch (e: any) {
      printError(`Spawn failed: ${e.message}`);
    }
  });

// ── info ────────────────────────────────────────────────────────

program
  .command('info <agent-id>')
  .description('Get detailed agent info')
  .option('--json', 'Output as JSON')
  .action(async (agentId: string, opts: { json?: boolean }) => {
    printHeader('Agent Info');

    try {
      const res = await fetch(`${API_BASE}/v1/agents/${agentId}`, {
        signal: AbortSignal.timeout(8000),
        credentials: 'include',
      });

      if (!res.ok) {
        printError(`HTTP ${res.status}`);
        return;
      }

      const agent = await res.json();

      if (opts.json) {
        console.log(JSON.stringify(agent, null, 2));
        return;
      }

      const lines = [
        `Name: ${agent.name || agent.id || agentId}`,
        `Rarity: ${agent.rarity_label || agent.rarity_tier || '?'}`,
        `Level: ${agent.level || agent.xp_level || 1}`,
        `XP: ${agent.xp || 0}`,
        `Traits: ${agent.traits?.join(', ') || 'none listed'}`,
      ];
      printPanel(lines, { title: 'Agent Details' });
    } catch (e: any) {
      printError(`Failed: ${e.message}`);
    }
  });

export default program;
