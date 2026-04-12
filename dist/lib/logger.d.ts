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
export declare function ensureLogDir(): Promise<void>;
export declare function getLogFilePath(service: string): string;
export declare function writeLog(entry: LogEntry): Promise<void>;
export declare function createLogger(service: string): Logger;
export declare function readLogs(service: string, lines: number): Promise<LogEntry[]>;
export declare function tailLogs(service: string, callback: (entry: LogEntry) => void): () => void;
export declare function getLogSize(service: string): Promise<number>;
export declare function clearLogs(service?: string): Promise<void>;
export declare function listLogFiles(): Promise<Array<{
    service: string;
    size: number;
    modified: Date;
}>>;
export declare function rotateLog(service: string, maxSizeMB?: number): Promise<void>;
export declare function parseLogLine(line: string): LogEntry | null;
//# sourceMappingURL=logger.d.ts.map