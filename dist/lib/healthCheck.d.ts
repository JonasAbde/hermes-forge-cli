export interface HealthResult {
    url: string;
    status: 'up' | 'down' | 'error';
    responseTime?: number;
    message?: string;
}
export declare function checkHealth(url: string, timeoutMs?: number): Promise<HealthResult>;
export declare function checkMultipleHealth(urls: string[], timeoutMs?: number): Promise<HealthResult[]>;
//# sourceMappingURL=healthCheck.d.ts.map