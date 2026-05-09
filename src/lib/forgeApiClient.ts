/**
 * Forge API Client — communicates with the remote forge.tekup.dk API.
 */
import {
  ForgeApiConfig,
  ForgeDeployment,
  ForgeRemotePack,
  ForgeSynergyResult,
  ForgeApiUser,
} from '../types.js';

export class ForgeApiClient {
  private config: ForgeApiConfig;

  constructor(config?: Partial<ForgeApiConfig>) {
    this.config = {
      baseUrl: config?.baseUrl || 'https://forge.tekup.dk/api/forge/v1',
      apiKey: config?.apiKey,
      sessionCookie: config?.sessionCookie,
    };
  }

  private get base(): string {
    return this.config.baseUrl.replace(/\/+$/, '');
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
    if (this.config.sessionCookie) {
      headers['Cookie'] = `forge_session=${this.config.sessionCookie}`;
    }
    return headers;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<{ data: T; status: number }> {
    const url = `${this.base}${path.startsWith('/') ? path : `/${path}`}`;
    const res = await fetch(url, {
      method,
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    const data = text ? (JSON.parse(text) as T) : ({} as T);
    return { data, status: res.status };
  }

  // ─── Health ────────────────────────────────

  async checkHealth(): Promise<{ status: string; forge_db?: string; catalog?: string } | null> {
    try {
      const res = await fetch(`${this.base.replace('/api/forge/v1', '')}/api/forge/v1/health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return null;
      return (await res.json()) as { status: string; forge_db?: string; catalog?: string };
    } catch {
      return null;
    }
  }

  // ─── Packs ────────────────────────────────

  async listPacks(): Promise<ForgeRemotePack[]> {
    const { data } = await this.request<{ packs: ForgeRemotePack[] }>('GET', '/packs');
    return data.packs || [];
  }

  // ─── Deployments ──────────────────────────

  async listDeployments(): Promise<ForgeDeployment[]> {
    const { data } = await this.request<{ deployments: ForgeDeployment[] }>(
      'GET',
      '/agents/deployments',
    );
    return data.deployments || [];
  }

  async createDeployment(name: string, packIds: string[]): Promise<ForgeDeployment> {
    const { data } = await this.request<ForgeDeployment>('POST', '/agents/deploy', {
      name,
      pack_ids: packIds,
    });
    return data;
  }

  async deleteDeployment(id: string): Promise<void> {
    await this.request('DELETE', `/agents/deployments/${encodeURIComponent(id)}`);
  }

  async startDeployment(id: string): Promise<ForgeDeployment> {
    const { data } = await this.request<ForgeDeployment>(
      'POST',
      `/agents/deployments/${encodeURIComponent(id)}/start`,
    );
    return data;
  }

  async stopDeployment(id: string): Promise<ForgeDeployment> {
    const { data } = await this.request<ForgeDeployment>(
      'POST',
      `/agents/deployments/${encodeURIComponent(id)}/stop`,
    );
    return data;
  }

  // ─── Synergies ────────────────────────────

  async discoverSynergies(packIds?: string[]): Promise<ForgeSynergyResult[]> {
    const qs = packIds?.length ? `?packIds=${packIds.join(',')}` : '';
    const { data } = await this.request<{ synergies: ForgeSynergyResult[] }>(
      'GET',
      `/synthesis/synergies${qs}`,
    );
    return data.synergies || [];
  }

  // ─── Auth / Me ────────────────────────────

  async getProfile(): Promise<ForgeApiUser | null> {
    const { data, status } = await this.request<{ user: ForgeApiUser | null }>('GET', '/me');
    if (status === 401) return null;
    return data.user || null;
  }
}
