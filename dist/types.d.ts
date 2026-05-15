import type { User, ForgeDeployment } from '@jonasabde/forge-api';
export type { User as ForgeApiUser, ForgeDeployment };
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
export interface ExtensionCommand {
    name: string;
    description: string;
    module: string;
    aliases?: string[];
}
export interface ExtensionHooks {
    onInit?: string;
    onBeforeExit?: string;
    onCommand?: string;
}
export interface ExtensionManifest {
    name: string;
    version: string;
    description?: string;
    commands?: ExtensionCommand[];
    hooks?: ExtensionHooks;
    dependencies?: Record<string, string>;
}
export interface ExtensionEntry {
    manifest: ExtensionManifest;
    dir: string;
    enabled: boolean;
}
export type HookName = 'onInit' | 'onBeforeExit' | 'onCommand';
//# sourceMappingURL=types.d.ts.map