import Conf from 'conf';
const schema = {
    ports: {
        type: 'object',
        properties: {
            web: { type: 'number' },
            api: { type: 'number' },
            docs: { type: 'number' },
            mcp: { type: 'number' }
        }
    },
    browser: { type: 'string', enum: ['default', 'chrome', 'firefox', 'edge'] },
    wsl2HostOverride: { type: ['string', 'null'] },
    defaultFlags: {
        type: 'object',
        properties: {
            dev: { type: 'array', items: { type: 'string' } },
            status: { type: 'array', items: { type: 'string' } }
        }
    },
    mcpRegistry: {
        type: 'object',
        properties: {
            pythonRuntime: { type: 'string', enum: ['uv', 'python3', 'python'] },
            detachByDefault: { type: 'boolean' }
        }
    },
    activeEnvironment: { type: 'string' },
    aliases: {
        type: 'object',
        additionalProperties: { type: 'string' }
    }
};
export class ConfigManager {
    config;
    constructor() {
        this.config = new Conf({
            projectName: 'forge',
            defaults: {
                ports: {
                    web: 5180,
                    api: 5181,
                    docs: 5190,
                    mcp: 8641
                },
                browser: 'default',
                wsl2HostOverride: null,
                defaultFlags: {
                    dev: ['--with-docs'],
                    status: ['--watch']
                },
                mcpRegistry: {
                    pythonRuntime: 'uv',
                    detachByDefault: false
                }
            },
            schema
        });
    }
    get() {
        return this.config.store;
    }
    set(key, value) {
        this.config.set(key, value);
    }
    getPort(service) {
        const ports = this.config.get('ports');
        return ports[service];
    }
}
export const config = new ConfigManager();
//# sourceMappingURL=configManager.js.map