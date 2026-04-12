/**
 * Performance profiler for Forge CLI commands
 * Tracks execution time and resource usage
 */

import { performance } from 'perf_hooks';
import chalk from 'chalk';

interface ProfileEntry {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  parent?: string;
  children: string[];
  metadata?: Record<string, unknown>;
}

interface ProfileData {
  command: string;
  args: string[];
  startTime: number;
  endTime?: number;
  totalDuration?: number;
  entries: Map<string, ProfileEntry>;
  rootEntries: string[];
}

interface ProfileReport {
  command: string;
  args: string[];
  totalDuration: number;
  stages: Array<{
    name: string;
    duration: number;
    percentage: number;
    level: number;
  }>;
  memory: {
    used: number;
    peak: number;
  };
}

class Profiler {
  private data: ProfileData | null = null;
  private activeEntry: string | null = null;
  private memoryStart: NodeJS.MemoryUsage | null = null;

  start(command: string, args: string[] = []): void {
    this.data = {
      command,
      args,
      startTime: performance.now(),
      entries: new Map(),
      rootEntries: []
    };
    this.memoryStart = process.memoryUsage();
    this.activeEntry = null;
  }

  stage(name: string, metadata?: Record<string, unknown>): void {
    if (!this.data) return;

    const id = `${name}_${performance.now()}`;
    const entry: ProfileEntry = {
      name,
      startTime: performance.now(),
      parent: this.activeEntry || undefined,
      children: [],
      metadata
    };

    this.data.entries.set(id, entry);

    if (this.activeEntry) {
      const parent = this.data.entries.get(this.activeEntry);
      if (parent) {
        parent.children.push(id);
      }
    } else {
      this.data.rootEntries.push(id);
    }

    this.activeEntry = id;
  }

  endStage(): void {
    if (!this.data || !this.activeEntry) return;

    const entry = this.data.entries.get(this.activeEntry);
    if (entry) {
      entry.endTime = performance.now();
      entry.duration = entry.endTime - entry.startTime;
    }

    // Move back to parent
    const current = this.data.entries.get(this.activeEntry);
    this.activeEntry = current?.parent || null;
  }

  end(): ProfileReport | null {
    if (!this.data) return null;

    // End any remaining active stages
    while (this.activeEntry) {
      this.endStage();
    }

    this.data.endTime = performance.now();
    this.data.totalDuration = this.data.endTime - this.data.startTime;

    const memoryEnd = process.memoryUsage();
    const memoryUsed = this.memoryStart 
      ? memoryEnd.heapUsed - this.memoryStart.heapUsed 
      : 0;

    return this.generateReport(memoryUsed, memoryEnd.heapUsed);
  }

  private generateReport(used: number, peak: number): ProfileReport {
    if (!this.data) throw new Error('Profiler not started');

    const stages: ProfileReport['stages'] = [];
    const totalDuration = this.data.totalDuration || 1;

    const processEntry = (id: string, level: number) => {
      const entry = this.data!.entries.get(id);
      if (!entry) return;

      const duration = entry.duration || 0;
      stages.push({
        name: entry.name,
        duration,
        percentage: (duration / totalDuration) * 100,
        level
      });

      entry.children.forEach(childId => processEntry(childId, level + 1));
    };

    this.data.rootEntries.forEach(id => processEntry(id, 0));

    // Sort by duration descending
    stages.sort((a, b) => b.duration - a.duration);

    return {
      command: this.data.command,
      args: this.data.args,
      totalDuration: this.data.totalDuration || 0,
      stages,
      memory: {
        used,
        peak
      }
    };
  }
}

// Global profiler instance
export const profiler = new Profiler();

// Format duration for display
export function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(2)}µs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// Format bytes for display
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
}

// Print profile report
export function printProfileReport(report: ProfileReport): void {
  console.log('');
  console.log(chalk.bold.cyan('Performance Profile'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(`Command: ${chalk.yellow(report.command)} ${report.args.join(' ')}`);
  console.log(`Total:   ${chalk.green(formatDuration(report.totalDuration))}`);
  console.log(`Memory:  ${chalk.blue(formatBytes(report.memory.used))} used, ${chalk.blue(formatBytes(report.memory.peak))} peak`);
  console.log('');
  
  if (report.stages.length > 0) {
    console.log(chalk.bold('Stages:'));
    report.stages.forEach(stage => {
      const indent = '  '.repeat(stage.level);
      const bar = '█'.repeat(Math.round(stage.percentage / 5));
      console.log(`${indent}${stage.name.padEnd(20)} ${formatDuration(stage.duration).padStart(10)} ${chalk.gray(bar)} ${stage.percentage.toFixed(1)}%`);
    });
  }
  console.log('');
}

// Middleware to profile commands
export function withProfiling<T extends (...args: unknown[]) => Promise<unknown>>(fn: T): T {
  return (async (...args: unknown[]) => {
    const cmd = args[0] as { name?: () => string; args?: string[] } | undefined;
    const command = cmd?.name?.() ?? 'unknown';
    const commandArgs = cmd?.args ?? [];

    profiler.start(command, commandArgs);

    try {
      profiler.stage('execute');
      const result = await fn(...args);
      profiler.endStage();
      return result;
    } finally {
      const report = profiler.end();
      if (report) {
        printProfileReport(report);
      }
    }
  }) as T;
}
