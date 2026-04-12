import { CliConfig } from '../types.js';
export declare class ConfigManager {
    private config;
    constructor();
    get(): CliConfig;
    set<K extends keyof CliConfig>(key: K, value: CliConfig[K]): void;
    getPort(service: keyof CliConfig['ports']): number;
}
export declare const config: ConfigManager;
//# sourceMappingURL=configManager.d.ts.map