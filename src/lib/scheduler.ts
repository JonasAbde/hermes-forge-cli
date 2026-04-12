/**
 * Task Scheduler for Forge CLI
 * Provides cron-like scheduling for recurring tasks
 */

import { writeFile, readFile, mkdir, readdir, unlink } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { execa } from 'execa';
import { existsSync } from 'fs';

const SCHEDULER_DIR = join(homedir(), '.forge', 'scheduler');
const TASKS_FILE = join(SCHEDULER_DIR, 'tasks.json');
const LOGS_DIR = join(SCHEDULER_DIR, 'logs');

export interface ScheduledTask {
  id: string;
  name: string;
  command: string;
  schedule: string; // cron expression or preset
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  lastStatus?: 'success' | 'failed' | 'running';
  lastOutput?: string;
  runCount: number;
  failCount: number;
  createdAt: string;
  notifyOnFailure?: boolean;
  notifyOnSuccess?: boolean;
  workingDirectory?: string;
}

// Cron preset shortcuts
const SCHEDULE_PRESETS: Record<string, string> = {
  '@hourly': '0 * * * *',
  '@daily': '0 0 * * *',
  '@weekly': '0 0 * * 0',
  '@monthly': '0 0 1 * *',
  '@yearly': '0 0 1 1 *',
  '@reboot': '@reboot',
  '@startup': '@startup',
};

// Parse cron expression to get next run time
export function parseSchedule(schedule: string): Date | null {
  const normalized = SCHEDULE_PRESETS[schedule] || schedule;
  
  if (normalized === '@reboot' || normalized === '@startup') {
    return new Date(); // Run immediately on startup
  }
  
  // Simple cron parser for basic expressions
  const parts = normalized.split(' ');
  if (parts.length !== 5) return null;
  
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  const now = new Date();
  const next = new Date(now);
  
  // Start from next minute
  next.setSeconds(0);
  next.setMilliseconds(0);
  next.setMinutes(next.getMinutes() + 1);
  
  // Try to find next occurrence (simplified - max 1 year search)
  for (let i = 0; i < 365 * 24 * 60; i++) {
    if (matchesSchedule(next, minute, hour, dayOfMonth, month, dayOfWeek)) {
      return next;
    }
    next.setMinutes(next.getMinutes() + 1);
  }
  
  return null;
}

function matchesSchedule(
  date: Date,
  minute: string,
  hour: string,
  dayOfMonth: string,
  month: string,
  dayOfWeek: string
): boolean {
  const matches = (value: number, pattern: string): boolean => {
    if (pattern === '*') return true;
    if (pattern.includes(',')) {
      return pattern.split(',').some(p => matches(value, p.trim()));
    }
    if (pattern.includes('-')) {
      const [start, end] = pattern.split('-').map(Number);
      return value >= start && value <= end;
    }
    if (pattern.includes('/')) {
      const [base, step] = pattern.split('/');
      if (base !== '*') return false;
      return value % Number(step) === 0;
    }
    return value === Number(pattern);
  };
  
  return (
    matches(date.getMinutes(), minute) &&
    matches(date.getHours(), hour) &&
    matches(date.getDate(), dayOfMonth) &&
    matches(date.getMonth() + 1, month) &&
    matches(date.getDay(), dayOfWeek)
  );
}

// Ensure directories exist
async function ensureDirectories(): Promise<void> {
  await mkdir(SCHEDULER_DIR, { recursive: true });
  await mkdir(LOGS_DIR, { recursive: true });
}

// Load all tasks
export async function loadTasks(): Promise<ScheduledTask[]> {
  await ensureDirectories();
  
  try {
    const content = await readFile(TASKS_FILE, 'utf8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

// Save tasks
async function saveTasks(tasks: ScheduledTask[]): Promise<void> {
  await ensureDirectories();
  await writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2));
}

// Generate unique ID
function generateId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Add a new task
export async function addTask(task: Omit<ScheduledTask, 'id' | 'createdAt' | 'runCount' | 'failCount'>): Promise<ScheduledTask> {
  const tasks = await loadTasks();
  
  const newTask: ScheduledTask = {
    ...task,
    id: generateId(),
    createdAt: new Date().toISOString(),
    runCount: 0,
    failCount: 0,
    nextRun: parseSchedule(task.schedule)?.toISOString()
  };
  
  tasks.push(newTask);
  await saveTasks(tasks);
  
  return newTask;
}

// Remove a task
export async function removeTask(id: string): Promise<boolean> {
  const tasks = await loadTasks();
  const index = tasks.findIndex(t => t.id === id);
  
  if (index === -1) return false;
  
  tasks.splice(index, 1);
  await saveTasks(tasks);
  
  return true;
}

// Get a single task
export async function getTask(id: string): Promise<ScheduledTask | null> {
  const tasks = await loadTasks();
  return tasks.find(t => t.id === id) || null;
}

// Update a task
export async function updateTask(id: string, updates: Partial<ScheduledTask>): Promise<ScheduledTask | null> {
  const tasks = await loadTasks();
  const index = tasks.findIndex(t => t.id === id);
  
  if (index === -1) return null;
  
  tasks[index] = { ...tasks[index], ...updates };
  
  // Recalculate next run if schedule changed
  if (updates.schedule) {
    tasks[index].nextRun = parseSchedule(updates.schedule)?.toISOString();
  }
  
  await saveTasks(tasks);
  return tasks[index];
}

// Run a task immediately
export async function runTask(task: ScheduledTask): Promise<{ success: boolean; output: string; duration: number }> {
  const startTime = Date.now();
  const logFile = join(LOGS_DIR, `${task.id}_${Date.now()}.log`);
  
  try {
    const cwd = task.workingDirectory || process.cwd();
    const result = await execa('bash', ['-c', task.command], {
      cwd,
      timeout: 300000, // 5 minute timeout
      all: true
    });
    
    const duration = Date.now() - startTime;
    const output = result.all || result.stdout || 'No output';
    
    // Write log
    await writeFile(logFile, `[${new Date().toISOString()}]\nExit code: ${result.exitCode}\n\n${output}`);
    
    // Update task
    await updateTask(task.id, {
      lastRun: new Date().toISOString(),
      lastStatus: 'success',
      lastOutput: output.slice(0, 1000), // Truncate for storage
      runCount: task.runCount + 1
    });
    
    return { success: true, output, duration };
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const output = error.all || error.message || 'Unknown error';
    
    // Write log
    await writeFile(logFile, `[${new Date().toISOString()}]\nFAILED\n\n${output}`);
    
    // Update task
    await updateTask(task.id, {
      lastRun: new Date().toISOString(),
      lastStatus: 'failed',
      lastOutput: output.slice(0, 1000),
      failCount: task.failCount + 1
    });
    
    return { success: false, output, duration };
  }
}

// Get tasks that should run now
export async function getDueTasks(): Promise<ScheduledTask[]> {
  const tasks = await loadTasks();
  const now = new Date();
  
  return tasks.filter(task => {
    if (!task.enabled) return false;
    if (!task.nextRun) return false;
    return new Date(task.nextRun) <= now;
  });
}

// Run scheduler tick (check for due tasks)
export async function runSchedulerTick(): Promise<{ run: number; errors: string[] }> {
  const dueTasks = await getDueTasks();
  const errors: string[] = [];
  
  for (const task of dueTasks) {
    try {
      await runTask(task);
      
      // Update next run time
      const nextRun = parseSchedule(task.schedule);
      await updateTask(task.id, {
        nextRun: nextRun?.toISOString(),
        lastStatus: 'success'
      });
    } catch (error: any) {
      errors.push(`Task ${task.name}: ${error.message}`);
    }
  }
  
  return { run: dueTasks.length, errors };
}

// Get task history/logs
export async function getTaskLogs(taskId?: string, limit: number = 10): Promise<Array<{
  taskId?: string;
  file: string;
  date: Date;
  content: string;
}>> {
  try {
    const files = await readdir(LOGS_DIR);
    const logFiles = files
      .filter(f => f.endsWith('.log'))
      .filter(f => !taskId || f.startsWith(taskId))
      .sort()
      .reverse()
      .slice(0, limit);
    
    const logs = [];
    for (const file of logFiles) {
      const content = await readFile(join(LOGS_DIR, file), 'utf8');
      const timestamp = file.match(/_(\d+)\.log$/)?.[1];
      logs.push({
        taskId: file.split('_')[0],
        file,
        date: timestamp ? new Date(Number(timestamp)) : new Date(),
        content
      });
    }
    
    return logs;
  } catch {
    return [];
  }
}

// Clean old logs
export async function cleanOldLogs(olderThanDays: number = 7): Promise<number> {
  try {
    const files = await readdir(LOGS_DIR);
    const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    let deleted = 0;
    
    for (const file of files) {
      if (!file.endsWith('.log')) continue;
      
      const timestamp = file.match(/_(\d+)\.log$/)?.[1];
      if (timestamp && Number(timestamp) < cutoff) {
        await unlink(join(LOGS_DIR, file));
        deleted++;
      }
    }
    
    return deleted;
  } catch {
    return 0;
  }
}

// Start scheduler daemon (runs in background)
export async function startSchedulerDaemon(): Promise<{ pid: number; logFile: string }> {
  const logFile = join(SCHEDULER_DIR, 'daemon.log');
  
  // Simple daemon that runs scheduler tick every minute
  const daemonScript = `
#!/usr/bin/env node
const { runSchedulerTick } = require('./dist/lib/scheduler.js');

async function tick() {
  try {
    const result = await runSchedulerTick();
    if (result.run > 0) {
      console.log(\`[\${new Date().toISOString()}] Ran \${result.run} task(s)\`);
    }
    if (result.errors.length > 0) {
      console.error(\`[\${new Date().toISOString()}] Errors: \${result.errors.join(', ')}\`);
    }
  } catch (e) {
    console.error('Scheduler error:', e);
  }
}

// Run immediately
tick();

// Then every minute
setInterval(tick, 60000);

console.log('Forge Scheduler Daemon started');
`;
  
  await writeFile(join(SCHEDULER_DIR, 'daemon.js'), daemonScript);
  
  // Write daemon info file
  const daemonInfo = {
    pid: process.pid,
    startedAt: new Date().toISOString(),
    logFile
  };
  await writeFile(join(SCHEDULER_DIR, 'daemon.json'), JSON.stringify(daemonInfo, null, 2));
  
  // Start the daemon detached
  const proc = await execa('node', [join(SCHEDULER_DIR, 'daemon.js')], {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  return { pid: process.pid, logFile };
}

// Validate cron expression
export function validateCronExpression(expr: string): { valid: boolean; error?: string } {
  if (SCHEDULE_PRESETS[expr]) {
    return { valid: true };
  }
  
  const parts = expr.split(' ');
  if (parts.length !== 5) {
    return { valid: false, error: 'Cron expression must have 5 parts (minute hour day month weekday)' };
  }
  
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  
  // Basic validation
  const validators = [
    { name: 'minute', value: minute, min: 0, max: 59 },
    { name: 'hour', value: hour, min: 0, max: 23 },
    { name: 'dayOfMonth', value: dayOfMonth, min: 1, max: 31 },
    { name: 'month', value: month, min: 1, max: 12 },
    { name: 'dayOfWeek', value: dayOfWeek, min: 0, max: 7 },
  ];
  
  for (const { name, value, min, max } of validators) {
    if (value !== '*' && !value.includes(',') && !value.includes('-') && !value.includes('/')) {
      const num = Number(value);
      if (isNaN(num) || num < min || num > max) {
        return { valid: false, error: `Invalid ${name}: ${value} (must be ${min}-${max} or *)` };
      }
    }
  }
  
  return { valid: true };
}
