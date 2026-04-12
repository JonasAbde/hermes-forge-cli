import Conf from 'conf';
import { CliConfig } from '../types.js';

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
} as const;

export class ConfigManager {
  private config: Conf<CliConfig>;

  constructor() {
    this.config = new Conf<CliConfig>({
      projectName: 'forge',
      defaults: {
        ports: {
          web: 5180,
          api: 5181,
          docs: 5190,
          mcp: 5200
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

  get(): CliConfig {
    return this.config.store;
  }

  set<K extends keyof CliConfig>(key: K, value: CliConfig[K]): void {
    this.config.set(key, value);
  }

  getPort(service: keyof CliConfig['ports']): number {
    const ports = this.config.get('ports');
    return ports[service];
  }
}

export const config = new ConfigManager();
