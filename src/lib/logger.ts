import { appendFile, mkdir, readFile, stat, unlink, rename, readdir } from 'fs/promises';
import { watch, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import chalk from 'chalk';

const LOG_DIR = join(homedir(), '.forge', 'logs');

export interface LogEntry {
  timestamp: string;
  service: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  pid?: number;
  metadata?: Record<string, unknown>;
}

export interface Logger {
  debug(message: string, metadata?: Record<string, unknown>): Promise<void>;
  info(message: string, metadata?: Record<string, unknown>): Promise<void>;
  warn(message: string, metadata?: Record<string, unknown>): Promise<void>;
  error(message: string, metadata?: Record<string, unknown>): Promise<void>;
}

export async function ensureLogDir(): Promise<void> {
  await mkdir(LOG_DIR, { recursive: true });
}

export function getLogFilePath(service: string): string {
  return join(LOG_DIR, `${service}.log`);
}

export async function writeLog(entry: LogEntry): Promise<void> {
  await ensureLogDir();
  const logPath = getLogFilePath(entry.service);
  const jsonLine = JSON.stringify(entry) + '\n';
  await appendFile(logPath, jsonLine);
}

function formatConsoleOutput(entry: LogEntry): string {
  const timestamp = chalk.gray(`[${new Date(entry.timestamp).toLocaleTimeString()}]`);
  const service = chalk.cyan(`[${entry.service}]`);
  
  let level: string;
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

export function createLogger(service: string): Logger {
  const pid = process.pid;
  
  const log = async (level: LogEntry['level'], message: string, metadata?: Record<string, unknown>) => {
    const entry: LogEntry = {
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

export async function readLogs(service: string, lines: number): Promise<LogEntry[]> {
  const logPath = getLogFilePath(service);
  
  try {
    const content = await readFile(logPath, 'utf8');
    const allLines = content.trim().split('\n').filter(Boolean);
    const lastNLines = allLines.slice(-lines);
    
    return lastNLines.map(line => {
      try {
        return JSON.parse(line) as LogEntry;
      } catch {
        return {
          timestamp: new Date().toISOString(),
          service,
          level: 'info',
          message: line,
          pid: undefined
        };
      }
    });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export function tailLogs(service: string, callback: (entry: LogEntry) => void): () => void {
  const logPath = getLogFilePath(service);

  // Ensure log directory and file exists before watching
  if (!existsSync(LOG_DIR)) {
    try {
      mkdirSync(LOG_DIR, { recursive: true });
    } catch {
      // Ignore
    }
  }

  if (!existsSync(logPath)) {
    try {
      writeFileSync(logPath, '');
    } catch {
      // Ignore
    }
  }

  // Track file size so we only read new content since the last read
  let lastSize = 0;
  stat(logPath).then(s => { lastSize = s.size; }).catch(() => { lastSize = 0; });

  const watcher = watch(logPath, (eventType) => {
    if (eventType !== 'change') return;
    stat(logPath)
      .then(async (s) => {
        if (s.size <= lastSize) return;
        const content = await readFile(logPath, 'utf8');
        const lines = content.trim().split('\n').filter(Boolean);
        // Emit only lines that are new since the last read
        const currentLineCount = lines.length;
        const newLines = lines.slice(Math.max(0, currentLineCount - Math.ceil((s.size - lastSize) / 80)));
        lastSize = s.size;
        for (const line of newLines) {
          try {
            callback(JSON.parse(line) as LogEntry);
          } catch {
            callback({
              timestamp: new Date().toISOString(),
              service,
              level: 'info',
              message: line,
            });
          }
        }
      })
      .catch(() => {/* file disappeared during watch */});
  });

  return () => watcher.close();
}

export async function getLogSize(service: string): Promise<number> {
  try {
    const stats = await stat(getLogFilePath(service));
    return stats.size;
  } catch {
    return 0;
  }
}

export async function clearLogs(service?: string): Promise<void> {
  if (service) {
    try {
      await unlink(getLogFilePath(service));
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  } else {
    // Clear all logs
    try {
      const files = await readdir(LOG_DIR);
      for (const file of files) {
        if (file.endsWith('.log')) {
          await unlink(join(LOG_DIR, file));
        }
      }
    } catch {
      // Ignore errors
    }
  }
}

export async function listLogFiles(): Promise<Array<{ service: string; size: number; modified: Date }>> {
  try {
    const files = await readdir(LOG_DIR);
    const logFiles: Array<{ service: string; size: number; modified: Date }> = [];
    
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
  } catch {
    return [];
  }
}

export async function rotateLog(service: string, maxSizeMB = 10): Promise<void> {
  const logPath = getLogFilePath(service);
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  try {
    const stats = await stat(logPath);
    if (stats.size > maxSizeBytes) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedPath = `${logPath}.${timestamp}.old`;
      await rename(logPath, rotatedPath);
    }
  } catch {
    // Ignore errors (file might not exist)
  }
}

export function parseLogLine(line: string): LogEntry | null {
  try {
    return JSON.parse(line) as LogEntry;
  } catch {
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
