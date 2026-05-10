export declare function getMcpRegistryPath(): string;
export declare function getMcpDefaultPort(): number;
export declare function getMcpBaseUrl(port?: number): string;
export declare function isMcpRegistryInstalled(): Promise<boolean>;
export declare function isMcpRunning(_port?: number): Promise<boolean>;
export interface McpStartResult {
    pid: number;
    port: number;
    url: string;
}
export declare function startMcpRegistry(port?: number): Promise<McpStartResult>;
export declare function stopMcpRegistry(): Promise<boolean>;
export declare function checkMcpHealth(port?: number): Promise<{
    ok: boolean;
    responseTime: number;
    error?: string;
}>;
/**
 * Fetch the list of MCP tool names via the /health/tools endpoint.
 * This avoids the MCP Streamable HTTP handshake (initialize → tools/list)
 * which requires specific Accept headers and session state.
 *
 * Distinguishes:
 *  - server down → throws "Connection refused"
 *  - HTTP error  → returns error detail
 *  - success     → returns tool name array
 */
export declare function listMcpTools(port?: number): Promise<{
    tools: string[];
    error?: string;
}>;
export interface McpTestResult {
    success: boolean;
    result?: any;
    error?: string;
    duration: number;
}
export declare function testMcpTool(toolName: string, params?: object, port?: number): Promise<McpTestResult>;
export declare function getMcpStatus(port?: number): Promise<{
    running: boolean;
    pid?: number;
    port: number;
    url: string;
    uptime?: number;
    tools: string[];
    toolsError?: string;
} | null>;
//# sourceMappingURL=mcpManager.d.ts.map