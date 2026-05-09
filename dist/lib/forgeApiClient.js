export class ForgeApiClient {
    config;
    constructor(config) {
        this.config = {
            baseUrl: config?.baseUrl || 'https://forge.tekup.dk/api/forge/v1',
            apiKey: config?.apiKey,
            sessionCookie: config?.sessionCookie,
        };
    }
    get base() {
        return this.config.baseUrl.replace(/\/+$/, '');
    }
    getHeaders() {
        const headers = {
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
    async request(method, path, body) {
        const url = `${this.base}${path.startsWith('/') ? path : `/${path}`}`;
        const res = await fetch(url, {
            method,
            headers: this.getHeaders(),
            body: body ? JSON.stringify(body) : undefined,
        });
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        return { data, status: res.status };
    }
    // ─── Health ────────────────────────────────
    async checkHealth() {
        try {
            const res = await fetch(`${this.base.replace('/api/forge/v1', '')}/api/forge/v1/health`, {
                signal: AbortSignal.timeout(5000),
            });
            if (!res.ok)
                return null;
            return (await res.json());
        }
        catch {
            return null;
        }
    }
    // ─── Packs ────────────────────────────────
    async listPacks() {
        const { data } = await this.request('GET', '/packs');
        return data.packs || [];
    }
    // ─── Deployments ──────────────────────────
    async listDeployments() {
        const { data } = await this.request('GET', '/agents/deployments');
        return data.deployments || [];
    }
    async createDeployment(name, packIds) {
        const { data } = await this.request('POST', '/agents/deploy', {
            name,
            pack_ids: packIds,
        });
        return data;
    }
    async deleteDeployment(id) {
        await this.request('DELETE', `/agents/deployments/${encodeURIComponent(id)}`);
    }
    async startDeployment(id) {
        const { data } = await this.request('POST', `/agents/deployments/${encodeURIComponent(id)}/start`);
        return data;
    }
    async stopDeployment(id) {
        const { data } = await this.request('POST', `/agents/deployments/${encodeURIComponent(id)}/stop`);
        return data;
    }
    // ─── Synergies ────────────────────────────
    async discoverSynergies(packIds) {
        const qs = packIds?.length ? `?packIds=${packIds.join(',')}` : '';
        const { data } = await this.request('GET', `/synthesis/synergies${qs}`);
        return data.synergies || [];
    }
    // ─── Auth / Me ────────────────────────────
    async getProfile() {
        const { data, status } = await this.request('GET', '/me');
        if (status === 401)
            return null;
        return data.user || null;
    }
}
//# sourceMappingURL=forgeApiClient.js.map