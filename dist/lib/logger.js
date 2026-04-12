import { appendFile, mkdir, readFile, stat, unlink, rename, readdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import chalk from 'chalk';
const LOG_DIR = join(homedir(), '.forge', 'logs');
export async function ensureLogDir() {
    await mkdir(LOG_DIR, { recursive: true });
}
export function getLogFilePath(service) {
    return join(LOG_DIR, `${service}.log`);
}
export async function writeLog(entry) {
    await ensureLogDir();
    const logPath = getLogFilePath(entry.service);
    const jsonLine = JSON.stringify(entry) + '\n';
    await appendFile(logPath, jsonLine);
}
function formatConsoleOutput(entry) {
    const timestamp = chalk.gray(`[${new Date(entry.timestamp).toLocaleTimeString()}]`);
    const service = chalk.cyan(`[${entry.service}]`);
    let level;
    switch (entry.level) {
        case 'debug':
            level = chalk.gray('[DBG]');
            break;
        case 'info':
            level = chalk.cyan('[INF]');
            break;
        case 'warn':
            level = chalk.yellow('[WRN]');
            break;
        case 'error':
            level = chalk.red('[ERR]');
            break;
    }
    return `${timestamp}${service}${level} ${entry.message}`;
}
export function createLogger(service) {
    const pid = process.pid;
    const log = async (level, message, metadata) => {
        const entry = {
            timestamp: new Date().toISOString(),
            service,
            level,
            message,
            pid,
            metadata
        };
        // Write to file
        await writeLog(entry);
        // Output to console if TTY
        if (process.stdout.isTTY) {
            console.log(formatConsoleOutput(entry));
        }
    };
    return {
        debug: (msg, meta) => log('debug', msg, meta),
        info: (msg, meta) => log('info', msg, meta),
        warn: (msg, meta) => log('warn', msg, meta),
        error: (msg, meta) => log('error', msg, meta)
    };
}
export async function readLogs(service, lines) {
    const logPath = getLogFilePath(service);
    try {
        const content = await readFile(logPath, 'utf8');
        const allLines = content.trim().split('\n').filter(Boolean);
        const lastNLines = allLines.slice(-lines);
        return lastNLines.map(line => {
            try {
                return JSON.parse(line);
            }
            catch {
                return {
                    timestamp: new Date().toISOString(),
                    service,
                    level: 'info',
                    message: line,
                    pid: undefined
                };
            }
        });
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}
export function tailLogs(service, callback) {
    const { watch } = require('fs');
    const logPath = getLogFilePath(service);
    // Start watching
    const watcher = watch(logPath, (eventType) => {
        if (eventType === 'change') {
            // Read last line
            readLogs(service, 1).then(entries => {
                if (entries.length > 0) {
                    callback(entries[0]);
                }
            });
        }
    });
    // Return unsubscribe function
    return () => watcher.close();
}
export async function getLogSize(service) {
    try {
        const stats = await stat(getLogFilePath(service));
        return stats.size;
    }
    catch {
        return 0;
    }
}
export async function clearLogs(service) {
    if (service) {
        try {
            await unlink(getLogFilePath(service));
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
    }
    else {
        // Clear all logs
        try {
            const files = await readdir(LOG_DIR);
            for (const file of files) {
                if (file.endsWith('.log')) {
                    await unlink(join(LOG_DIR, file));
                }
            }
        }
        catch {
            // Ignore errors
        }
    }
}
export async function listLogFiles() {
    try {
        const files = await readdir(LOG_DIR);
        const logFiles = [];
        for (const file of files) {
            if (file.endsWith('.log')) {
                const service = file.slice(0, -4); // Remove .log
                const stats = await stat(join(LOG_DIR, file));
                logFiles.push({
                    service,
                    size: stats.size,
                    modified: stats.mtime
                });
            }
        }
        return logFiles.sort((a, b) => b.modified.getTime() - a.modified.getTime());
    }
    catch {
        return [];
    }
}
export async function rotateLog(service, maxSizeMB = 10) {
    const logPath = getLogFilePath(service);
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    try {
        const stats = await stat(logPath);
        if (stats.size > maxSizeBytes) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const rotatedPath = `${logPath}.${timestamp}.old`;
            await rename(logPath, rotatedPath);
        }
    }
    catch {
        // Ignore errors (file might not exist)
    }
}
export function parseLogLine(line) {
    try {
        return JSON.parse(line);
    }
    catch {
        // Try to parse as plain text
        return {
            timestamp: new Date().toISOString(),
            service: 'unknown',
            level: 'info',
            message: line,
            pid: undefined
        };
    }
}
//# sourceMappingURL=logger.js.map