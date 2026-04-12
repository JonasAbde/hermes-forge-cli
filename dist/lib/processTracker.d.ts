export declare function isProcessRunning(pid: number): Promise<boolean>;
export declare function getProcessInfo(pid: number): Promise<{
    command?: string;
    startTime?: Date;
} | null>;
export declare function terminateProcess(pid: number, graceful?: boolean): Promise<void>;
export interface ProcessByPort {
    pid: number;
    command: string;
}
export declare function findProcessesByPort(port: number): Promise<ProcessByPort[]>;
export declare function waitForProcessExit(pid: number, timeoutMs: number, pollIntervalMs?: number): Promise<boolean>;
//# sourceMappingURL=processTracker.d.ts.map