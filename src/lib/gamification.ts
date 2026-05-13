/**
 * Forge CLI — Gamification Engine
 *
 * Tracks local XP, levels, and badges for CLI usage.
 * Stored in ~/.config/forge-cli/config.json via conf.
 */

import Conf from 'conf';

// ─── Types ───────────────────────────────────────────────────────

interface XpEvent {
  action: string;
  xp: number;
  ts: string;
}

export interface XpState {
  total: number;
  level: number;
  events: XpEvent[];
  badges: string[];
  commandCount: number;
}

export interface LevelInfo {
  level: number;
  currentXp: number;
  xpForNext: number;
  progress: number;
}

export interface BadgeDef {
  id: string;
  label: string;
  description: string;
  check: (state: XpState) => boolean;
}

// ─── Store ───────────────────────────────────────────────────────

const DEFAULT_XP: XpState = {
  total: 0,
  level: 1,
  events: [],
  badges: [],
  commandCount: 0,
};

const _store = new Conf<{ xp: XpState }>({
  projectName: 'forge-cli',
  defaults: { xp: DEFAULT_XP },
});

function getState(): XpState {
  return _store.get('xp');
}

function setState(s: XpState): void {
  _store.set('xp', s);
}

// ─── Constants ───────────────────────────────────────────────────

const XP_EVENTS: Record<string, number> = {
  command_run: 10,
  pack_built: 25,
  pack_validated: 15,
  deploy_created: 50,
  deploy_started: 30,
  pack_sync: 20,
  plugin_install: 20,
  agent_spawn: 40,
  ask_question: 15,
  suggest_used: 10,
};

const BADGES: BadgeDef[] = [
  { id: 'first_steps', label: 'First Steps', description: 'Run 10 commands', check: s => s.commandCount >= 10 },
  { id: 'power_user', label: 'Power User', description: 'Run 50 commands', check: s => s.commandCount >= 50 },
  { id: 'veteran', label: 'Veteran', description: 'Run 100 commands', check: s => s.commandCount >= 100 },
  { id: 'collector', label: 'Collector', description: 'Reach level 5', check: s => s.level >= 5 },
  { id: 'master', label: 'Master', description: 'Reach level 10', check: s => s.level >= 10 },
  { id: 'builder', label: 'Builder', description: 'Build 5 packs', check: s => countEvents(s, 'pack_built') >= 5 },
  { id: 'deployer', label: 'Deployer', description: 'Create first deployment', check: s => countEvents(s, 'deploy_created') >= 1 },
  { id: 'architect', label: 'Architect', description: 'Create 10 deployments', check: s => countEvents(s, 'deploy_created') >= 10 },
  { id: 'xp_hunter', label: 'XP Hunter', description: 'Earn 1,000 XP total', check: s => s.total >= 1000 },
  { id: 'xp_legend', label: 'XP Legend', description: 'Earn 10,000 XP total', check: s => s.total >= 10000 },
  { id: 'plugin_dev', label: 'Plugin Dev', description: 'Install a plugin', check: s => countEvents(s, 'plugin_install') >= 1 },
  { id: 'ai_explorer', label: 'AI Explorer', description: 'Use ask or suggest 5 times', check: s => countEvents(s, 'ask_question') + countEvents(s, 'suggest_used') >= 5 },
  { id: 'agent_master', label: 'Agent Master', description: 'Spawn 3 agents', check: s => countEvents(s, 'agent_spawn') >= 3 },
];

// ─── Helpers ─────────────────────────────────────────────────────

function countEvents(state: XpState, action: string): number {
  return state.events.filter(e => e.action === action).length;
}

export function xpForLevel(level: number): number {
  return level * level * 100;
}

export function levelFromXp(totalXp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= totalXp) {
    level++;
  }
  return level;
}

export function getLevelInfo(totalXp: number): LevelInfo {
  const level = levelFromXp(totalXp);
  const current = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return {
    level,
    currentXp: totalXp,
    xpForNext: next,
    progress: totalXp >= next ? 1 : Math.max(0, (totalXp - current) / (next - current)),
  };
}

// ─── Public API ──────────────────────────────────────────────────

/** Award XP for an action. Returns new state + any new badges. */
export function awardXp(action: string): { xp: number; state: XpState; newBadges: string[] } {
  const xpAmount = XP_EVENTS[action];
  if (!xpAmount) {
    throw new Error(`Unknown XP action: ${action}. Valid: ${Object.keys(XP_EVENTS).join(', ')}`);
  }

  const state = getState();
  const event: XpEvent = { action, xp: xpAmount, ts: new Date().toISOString() };
  state.events.push(event);
  if (state.events.length > 200) {
    state.events = state.events.slice(-100);
  }

  state.total += xpAmount;
  if (action === 'command_run') {
    state.commandCount += 1;
  }

  const newLevel = levelFromXp(state.total);
  if (newLevel > state.level) {
    state.level = newLevel;
  }

  const newBadges: string[] = [];
  for (const badge of BADGES) {
    if (!state.badges.includes(badge.id) && badge.check(state)) {
      state.badges.push(badge.id);
      newBadges.push(badge.id);
    }
  }

  setState(state);
  return { xp: xpAmount, state, newBadges };
}

/** Get current XP state. */
export function getXpState(): XpState {
  return getState();
}

/** Get all badge definitions with unlock status. */
export function getAllBadges(): Array<BadgeDef & { unlocked: boolean }> {
  const state = getState();
  return BADGES.map(b => ({ ...b, unlocked: state.badges.includes(b.id) }));
}

/** Get a badge definition by id. */
export function getBadgeDef(id: string): BadgeDef | undefined {
  return BADGES.find(b => b.id === id);
}

/** Reset all XP data. */
export function resetXp(): void {
  setState({ ...DEFAULT_XP });
}

/** Get known XP event types. */
export function getXpEventTypes(): Record<string, number> {
  return { ...XP_EVENTS };
}
