export interface ForgePackSummary {
    pack_id: string;
    slug: string;
    name: string;
    status: string;
    workspace_id?: string;
    visibility?: string;
    card_snippet?: string;
    summary_md?: string;
    docs_url?: string | null;
    trust_score?: number;
    rarity_tier?: string;
    rarity_label?: string;
    verification_state?: string;
    card_name?: string;
    card_title?: string;
    card_theme?: string;
    updated_at?: string;
    source_pack_id?: string | null;
    install_count?: number;
    metrics_runs?: number;
}
export interface ForgePackDetail {
    pack_id: string;
    slug: string;
    name: string;
    card_name?: string;
    card_title?: string;
    card_theme?: string;
    status: string;
    version?: string;
    entrypoint?: string;
    workspace_id?: string;
    visibility?: string;
    summary_md?: string;
    docs_url?: string | null;
    card_snippet?: string;
    capabilities_json?: string[];
    requirements_json?: string[];
    trust_score?: number;
    rarity_tier?: string;
    rarity_label?: string;
    verification_state?: string;
    source_pack_id?: string | null;
    source_workspace_id?: string | null;
    install_count?: number;
    clone_depth?: number;
}
export interface ServiceStatus {
    name: string;
    port: number;
    status: 'up' | 'down' | 'error';
    url?: string;
    pid?: number;
    message?: string;
}
export interface WslInfo {
    isWsl: boolean;
    isWsl2: boolean;
    hostIp: string | null;
    openCommand: (url: string) => string[];
}
export interface ForgeApiUser {
    id: string;
    email: string;
    role: string;
    display_name?: string;
    preferred_language?: string;
    tier: string;
    created_at: number;
    last_seen_at?: number;
}
export interface ForgeDeployment {
    id: string;
    user_id: string;
    name: string;
    pack_ids: string[];
    status: 'stopped' | 'running' | 'error';
    config_hash: string;
    version: number;
    created_at: string;
    updated_at: string;
}
export interface ForgeRemotePack {
    pack_id: string;
    slug: string;
    name: string;
    status: string;
    card_snippet?: string;
    rarity_label?: string;
    trust_score?: number;
    install_count?: number;
}
export interface ForgeSynergyResult {
    packA: string;
    packB: string;
    overlapScore: number;
    complementScore: number;
    noveltyScore: number;
    totalScore: number;
    emergentLabel: string;
}
export interface ForgeApiConfig {
    baseUrl: string;
    apiKey?: string;
    sessionCookie?: string;
}
export interface CliConfig {
    ports: {
        web: number;
        api: number;
        docs: number;
        mcp: number;
    };
    browser: 'default' | 'chrome' | 'firefox' | 'edge';
    wsl2HostOverride: string | null;
    defaultFlags: {
        dev: string[];
        status: string[];
    };
    mcpRegistry: {
        pythonRuntime: 'uv' | 'python3' | 'python';
        detachByDefault: boolean;
    };
    activeEnvironment?: string;
    aliases?: Record<string, string>;
    remote?: {
        baseUrl: string;
        apiKey?: string;
    };
}
//# sourceMappingURL=types.d.ts.map