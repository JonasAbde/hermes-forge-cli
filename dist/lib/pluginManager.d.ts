export interface Plugin {
    name: string;
    version: string;
    description: string;
    author?: string;
    entry: string;
    commands: string[];
    dependencies?: string[];
    repository?: string;
    installedAt?: string;
    updatedAt?: string;
}
export interface PluginManifest {
    name: string;
    version: string;
    description: string;
    author?: string;
    main: string;
    commands: Array<{
        name: string;
        description: string;
        alias?: string;
    }>;
    dependencies?: string[];
    repository?: string;
}
export declare function ensurePluginsDir(): Promise<void>;
export declare function getPluginDir(name: string): string;
export declare function listInstalledPlugins(): Promise<Plugin[]>;
export declare function loadPlugin(name: string): Promise<Plugin | null>;
export declare function isPluginInstalled(name: string): Promise<boolean>;
export declare function installPlugin(source: string, options?: {
    global?: boolean;
    version?: string;
}): Promise<Plugin>;
export declare function uninstallPlugin(name: string): Promise<void>;
export declare function updatePlugin(name: string): Promise<Plugin>;
export declare function executePlugin(pluginName: string, command: string, args?: string[]): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
}>;
export declare function searchPlugins(query?: string): Promise<Array<{
    name: string;
    version: string;
    description: string;
    author: string;
    installs: number;
}>>;
export declare function getPluginManifest(name: string): Promise<PluginManifest | null>;
export declare function validatePlugin(pluginDir: string): Promise<{
    valid: boolean;
    errors: string[];
}>;
//# sourceMappingURL=pluginManager.d.ts.map