export interface EnvDiff {
    onlyIn1: string[];
    onlyIn2: string[];
    different: Array<{
        key: string;
        val1: string;
        val2: string;
    }>;
}
export interface EnvValidation {
    valid: boolean;
    missing: string[];
    extra: string[];
}
export declare function isSecretKey(key: string): boolean;
export declare function maskValue(value: string): string;
export declare function maskSecrets(env: Record<string, string>): Record<string, string>;
export declare function parseEnvFile(content: string): Record<string, string>;
export declare function getEnvFilePath(environment: string): string;
export declare function loadEnv(environment: string): Promise<Record<string, string>>;
export declare function getActiveEnv(): string;
export declare function setActiveEnv(environment: string): void;
export declare function listEnvironments(): Promise<string[]>;
export declare function validateEnv(environment: string): Promise<EnvValidation>;
export declare function diffEnvironments(env1: string, env2: string): Promise<EnvDiff>;
export declare function getMaskedVariables(env: Record<string, string>): Array<{
    key: string;
    value: string;
    masked: boolean;
}>;
export declare function formatEnvForDisplay(env: Record<string, string>, raw?: boolean): Array<{
    key: string;
    value: string;
}>;
//# sourceMappingURL=envManager.d.ts.map