export interface HealthResult {
    url: string;
    status: 'up' | 'down' | 'error';
    responseTime?: number;
    message?: string;
}
/** Forge API GET /health JSON shape (see server/forge-api-core.mjs). */
export interface ForgeApiHealthResult {
    url: string;
    status: 'up' | 'down' | 'error';
    responseTime?: number;
    message?: string;
    /** True when status, forge_db, and catalog are all ok. */
    bodyOk: boolean;
    apiStatus?: string;
    forge_db?: 'ok' | 'error';
    catalog?: 'ok' | 'error';
    service?: string;
}
/**
 * Lightweight HTTP reachability check. Uses GET (not HEAD): Forge API and many dev
 * servers do not treat HEAD /health the same as GET, which caused false negatives.
 */
export declare function checkHealth(url: string, timeoutMs?: number): Promise<HealthResult>;
/**
 * GET /health on the Forge API and validate JSON (DB + catalog file probes).
 */
export declare function checkForgeApiHealth(baseUrl: string, timeoutMs?: number): Promise<ForgeApiHealthResult>;
/** GET /ready JSON (server/forge-api-core.mjs). */
export interface ForgeApiReadyResult {
    url: string;
    status: 'up' | 'down' | 'error';
    httpStatus?: number;
    responseTime?: number;
    message?: string;
    /** True when HTTP 200 and body.ready === true. */
    bodyOk: boolean;
    ready?: boolean;
    apiStatus?: string;
    checks?: {
        forge_db?: 'ok' | 'error';
        sqlite_query?: 'ok' | 'error';
        catalog?: 'ok' | 'error';
    };
    service?: string;
    timestamp?: string;
}
/**
 * GET /ready — strict readiness (503 when not ready).
 */
export declare function checkForgeApiReady(baseUrl: string, timeoutMs?: number): Promise<ForgeApiReadyResult>;
export declare function checkMultipleHealth(urls: string[], timeoutMs?: number): Promise<HealthResult[]>;
//# sourceMappingURL=healthCheck.d.ts.map