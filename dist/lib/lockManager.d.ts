export interface LockInfo {
    service: string;
    pid: number;
    port: number;
    startTime: string;
    command: string;
    restartCount: number;
    status: 'running' | 'crashed' | 'stopped';
}
export declare function acquireLock(service: string, pid: number, port: number, command: string): Promise<void>;
export declare function releaseLock(service: string): Promise<void>;
export declare function getLock(service: string): Promise<LockInfo | null>;
export declare function getAllLocks(): Promise<LockInfo[]>;
export declare function isLockValid(service: string): Promise<boolean>;
export declare function clearStaleLocks(): Promise<string[]>;
export declare function updateLockStatus(service: string, status: LockInfo['status']): Promise<void>;
export declare function incrementRestartCount(service: string): Promise<number>;
//# sourceMappingURL=lockManager.d.ts.map