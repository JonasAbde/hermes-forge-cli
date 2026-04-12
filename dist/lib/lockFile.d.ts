export interface LockInfo {
    service: string;
    pid: number;
    startTime: string;
    command?: string;
    ports?: number[];
}
export declare function isLockValid(service: string): {
    valid: boolean;
    info?: LockInfo;
};
export declare function acquireLock(service: string, pid: number, metadata?: {
    command?: string;
    ports?: number[];
}): void;
export declare function releaseLock(service: string): boolean;
export declare function getLockInfo(service: string): LockInfo | null;
export declare function getAllLocks(): Array<{
    service: string;
    info: LockInfo;
}>;
export declare function releaseAllLocks(): void;
export declare function getServiceNameFromOptions(options: {
    withDocs?: boolean;
    onlyApi?: boolean;
    onlyWeb?: boolean;
    onlyDocs?: boolean;
}): string;
export declare function getPortsForService(serviceName: string): number[];
//# sourceMappingURL=lockFile.d.ts.map