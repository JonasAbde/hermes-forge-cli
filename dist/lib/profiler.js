/**
 * Performance profiler for Forge CLI commands
 * Tracks execution time and resource usage
 */
import { performance } from 'perf_hooks';
import chalk from 'chalk';
class Profiler {
    data = null;
    activeEntry = null;
    memoryStart = null;
    start(command, args = []) {
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
    stage(name, metadata) {
        if (!this.data)
            return;
        const id = `${name}_${performance.now()}`;
        const entry = {
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
        }
        else {
            this.data.rootEntries.push(id);
        }
        this.activeEntry = id;
    }
    endStage() {
        if (!this.data || !this.activeEntry)
            return;
        const entry = this.data.entries.get(this.activeEntry);
        if (entry) {
            entry.endTime = performance.now();
            entry.duration = entry.endTime - entry.startTime;
        }
        // Move back to parent
        const current = this.data.entries.get(this.activeEntry);
        this.activeEntry = current?.parent || null;
    }
    end() {
        if (!this.data)
            return null;
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
    generateReport(used, peak) {
        if (!this.data)
            throw new Error('Profiler not started');
        const stages = [];
        const totalDuration = this.data.totalDuration || 1;
        const processEntry = (id, level) => {
            const entry = this.data.entries.get(id);
            if (!entry)
                return;
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
export function formatDuration(ms) {
    if (ms < 1)
        return `${(ms * 1000).toFixed(2)}µs`;
    if (ms < 1000)
        return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}
// Format bytes for display
export function formatBytes(bytes) {
    if (bytes < 1024)
        return `${bytes}B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)}KB`;
    if (bytes < 1024 * 1024 * 1024)
        return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
}
// Print profile report
export function printProfileReport(report) {
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
export function withProfiling(fn) {
    return async (...args) => {
        const commandLike = args[0];
        const command = commandLike?.name?.() || 'unknown';
        const commandArgs = commandLike?.args || [];
        profiler.start(command, commandArgs);
        try {
            profiler.stage('execute');
            const result = await fn(...args);
            profiler.endStage();
            return result;
        }
        finally {
            const report = profiler.end();
            if (report) {
                printProfileReport(report);
            }
        }
    };
}
//# sourceMappingURL=profiler.js.map