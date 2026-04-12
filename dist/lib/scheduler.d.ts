/**
 * Task Scheduler for Forge CLI
 * Provides cron-like scheduling for recurring tasks
 */
export interface ScheduledTask {
    id: string;
    name: string;
    command: string;
    schedule: string;
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
export declare function parseSchedule(schedule: string): Date | null;
export declare function loadTasks(): Promise<ScheduledTask[]>;
export declare function addTask(task: Omit<ScheduledTask, 'id' | 'createdAt' | 'runCount' | 'failCount'>): Promise<ScheduledTask>;
export declare function removeTask(id: string): Promise<boolean>;
export declare function getTask(id: string): Promise<ScheduledTask | null>;
export declare function updateTask(id: string, updates: Partial<ScheduledTask>): Promise<ScheduledTask | null>;
export declare function runTask(task: ScheduledTask): Promise<{
    success: boolean;
    output: string;
    duration: number;
}>;
export declare function getDueTasks(): Promise<ScheduledTask[]>;
export declare function runSchedulerTick(): Promise<{
    run: number;
    errors: string[];
}>;
export declare function getTaskLogs(taskId?: string, limit?: number): Promise<Array<{
    taskId?: string;
    file: string;
    date: Date;
    content: string;
}>>;
export declare function cleanOldLogs(olderThanDays?: number): Promise<number>;
export declare function startSchedulerDaemon(): Promise<{
    pid: number;
    logFile: string;
}>;
export declare function validateCronExpression(expr: string): {
    valid: boolean;
    error?: string;
};
//# sourceMappingURL=scheduler.d.ts.map