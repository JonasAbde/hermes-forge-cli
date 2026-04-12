/**
 * Multi-workspace management for Forge CLI
 * Manage multiple projects and switch between them
 */
export interface Workspace {
    id: string;
    name: string;
    path: string;
    description?: string;
    tags?: string[];
    color?: string;
    isDefault: boolean;
    lastAccessed?: string;
    createdAt: string;
    config?: {
        ports?: {
            web?: number;
            api?: number;
            docs?: number;
            mcp?: number;
        };
        envFile?: string;
        customCommands?: Record<string, string>;
    };
}
export declare function loadWorkspaces(): Promise<Workspace[]>;
export declare function addWorkspace(name: string, path: string, options?: {
    description?: string;
    tags?: string[];
    color?: string;
    makeDefault?: boolean;
}): Promise<Workspace>;
export declare function removeWorkspace(id: string): Promise<boolean>;
export declare function getWorkspace(idOrName: string): Promise<Workspace | null>;
export declare function getDefaultWorkspace(): Promise<Workspace | null>;
export declare function setDefaultWorkspace(id: string): Promise<boolean>;
export declare function updateWorkspace(id: string, updates: Partial<Omit<Workspace, 'id' | 'createdAt'>>): Promise<Workspace | null>;
export declare function switchToWorkspace(idOrName: string): Promise<Workspace | null>;
export declare function detectWorkspaces(searchPaths?: string[]): Promise<Array<{
    path: string;
    name: string;
    confidence: 'high' | 'medium' | 'low';
}>>;
export declare function importCurrentDirectory(): Promise<Workspace | null>;
export declare function runInWorkspace(workspaceId: string, command: string): Promise<{
    success: boolean;
    output: string;
    exitCode: number;
}>;
export declare function getWorkspaceStats(workspaceId: string): Promise<{
    diskSize: number;
    fileCount: number;
    gitBranch?: string;
    gitCommits?: number;
    lastModified: Date;
} | null>;
export declare function exportWorkspaceConfig(workspaceId: string): Promise<string | null>;
export declare function importWorkspaceConfig(configJson: string): Promise<Workspace>;
//# sourceMappingURL=workspaceManager.d.ts.map