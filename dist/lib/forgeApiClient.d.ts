/**
 * Forge API Client — communicates with the remote forge.tekup.dk API.
 */
import { ForgeApiConfig, ForgeDeployment, ForgeRemotePack, ForgeSynergyResult, ForgeApiUser } from '../types.js';
export declare class ForgeApiClient {
    private config;
    constructor(config?: Partial<ForgeApiConfig>);
    private get base();
    private getHeaders;
    private request;
    checkHealth(): Promise<{
        status: string;
        forge_db?: string;
        catalog?: string;
    } | null>;
    listPacks(): Promise<ForgeRemotePack[]>;
    listDeployments(): Promise<ForgeDeployment[]>;
    createDeployment(name: string, packIds: string[]): Promise<ForgeDeployment>;
    deleteDeployment(id: string): Promise<void>;
    startDeployment(id: string): Promise<ForgeDeployment>;
    stopDeployment(id: string): Promise<ForgeDeployment>;
    discoverSynergies(packIds?: string[]): Promise<ForgeSynergyResult[]>;
    getProfile(): Promise<ForgeApiUser | null>;
}
//# sourceMappingURL=forgeApiClient.d.ts.map