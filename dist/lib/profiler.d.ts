/**
 * Performance profiler for Forge CLI commands
 * Tracks execution time and resource usage
 */
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
declare class Profiler {
    private data;
    private activeEntry;
    private memoryStart;
    start(command: string, args?: string[]): void;
    stage(name: string, metadata?: Record<string, unknown>): void;
    endStage(): void;
    end(): ProfileReport | null;
    private generateReport;
}
export declare const profiler: Profiler;
export declare function formatDuration(ms: number): string;
export declare function formatBytes(bytes: number): string;
export declare function printProfileReport(report: ProfileReport): void;
export declare function withProfiling<T extends (...args: unknown[]) => Promise<unknown>>(fn: T): T;
export {};
//# sourceMappingURL=profiler.d.ts.map