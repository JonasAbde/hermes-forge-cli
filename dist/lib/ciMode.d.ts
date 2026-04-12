export declare const ExitCodes: {
    readonly SUCCESS: 0;
    readonly GENERAL_ERROR: 1;
    readonly MISUSE_OF_SHELL_BUILTINS: 2;
    readonly CONFIG_ERROR: 3;
    readonly PORT_CONFLICT: 4;
    readonly SERVICE_TIMEOUT: 5;
    readonly VALIDATION_FAILED: 6;
    readonly AUDIT_CRITICAL: 7;
    readonly BUILD_FAILED: 8;
    readonly TEST_FAILED: 9;
    readonly NOT_FOUND: 10;
    readonly PERMISSION_DENIED: 11;
};
export type ExitCode = typeof ExitCodes[keyof typeof ExitCodes];
export declare function isCiMode(): boolean;
export declare function ciOutput(data: unknown): string;
export interface CiResponse<T = unknown> {
    success: boolean;
    timestamp: string;
    exitCode: number;
    data?: T;
    error?: {
        message: string;
        code: string;
        details?: unknown;
    };
    metadata?: {
        command: string;
        args: string[];
        duration?: number;
        version: string;
    };
}
export declare function createCiResponse<T>(success: boolean, exitCode: number, data?: T, error?: {
    message: string;
    code: string;
    details?: unknown;
}): CiResponse<T>;
export declare function printAndExit<T>(success: boolean, exitCode: number, data?: T, error?: {
    message: string;
    code: string;
    details?: unknown;
}): never;
export declare function runWithExitCode<T>(fn: () => Promise<{
    success: boolean;
    data?: T;
    error?: string;
}>, successCode?: number, errorCode?: number): Promise<never>;
export declare function detectCiService(): string | null;
export declare function getCiEnvironment(): Record<string, unknown>;
//# sourceMappingURL=ciMode.d.ts.map