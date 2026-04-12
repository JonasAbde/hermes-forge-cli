import { readdir, readFile, mkdir, access, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { execa } from 'execa';
import { existsSync } from 'fs';
import chalk from 'chalk';

const PLUGINS_DIR = join(homedir(), '.forge', 'plugins');
const REGISTRY_URL = 'https://raw.githubusercontent.com/hermes-forge/cli-plugins/main';

export interface Plugin {
  name: string;
  version: string;
  description: string;
  author?: string;
  entry: string; // Path to entry file
  commands: string[]; // Commands this plugin provides
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

// Ensure plugins directory exists
export async function ensurePluginsDir(): Promise<void> {
  await mkdir(PLUGINS_DIR, { recursive: true });
}

// Get plugin directory
export function getPluginDir(name: string): string {
  return join(PLUGINS_DIR, name);
}

// List installed plugins
export async function listInstalledPlugins(): Promise<Plugin[]> {
  await ensurePluginsDir();
  
  try {
    const entries = await readdir(PLUGINS_DIR, { withFileTypes: true });
    const plugins: Plugin[] = [];
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const plugin = await loadPlugin(entry.name);
        if (plugin) {
          plugins.push(plugin);
        }
      }
    }
    
    return plugins.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

// Load a single plugin
export async function loadPlugin(name: string): Promise<Plugin | null> {
  const pluginDir = getPluginDir(name);
  const manifestPath = join(pluginDir, 'package.json');
  
  try {
    const content = await readFile(manifestPath, 'utf8');
    const manifest: PluginManifest = JSON.parse(content);
    
    const stats = await readdir(pluginDir);
    const installedAt = stats.length > 0 ? new Date().toISOString() : undefined;
    
    return {
      name: manifest.name,
      version: manifest.version,
      description: manifest.description,
      author: manifest.author,
      entry: join(pluginDir, manifest.main),
      commands: manifest.commands.map(c => c.name),
      dependencies: manifest.dependencies,
      repository: manifest.repository,
      installedAt
    };
  } catch {
    return null;
  }
}

// Check if plugin is installed
export async function isPluginInstalled(name: string): Promise<boolean> {
  const pluginDir = getPluginDir(name);
  try {
    await access(join(pluginDir, 'package.json'));
    return true;
  } catch {
    return false;
  }
}

// Install plugin from npm or git
export async function installPlugin(
  source: string,
  options: { global?: boolean; version?: string } = {}
): Promise<Plugin> {
  await ensurePluginsDir();
  
  // Determine plugin name from source
  let pluginName = source;
  if (source.startsWith('@')) {
    pluginName = source.split('/').slice(0, 2).join('/');
  } else if (source.includes('/')) {
    pluginName = source.split('/').pop()?.replace('.git', '') || source;
  }
  
  const pluginDir = getPluginDir(pluginName);
  
  // Check if already installed
  const existing = await isPluginInstalled(pluginName);
  if (existing) {
    throw new Error(`Plugin ${pluginName} is already installed. Use 'forge plugin update ${pluginName}' to update.`);
  }
  
  // Create plugin directory
  await mkdir(pluginDir, { recursive: true });
  
  try {
    // Try to install via npm
    if (source.startsWith('npm:') || !source.includes('/')) {
      // npm package
      const npmPackage = source.startsWith('npm:') ? source.slice(4) : source;
      await execa('npm', ['install', npmPackage, '--prefix', pluginDir], {
        cwd: pluginDir,
        timeout: 60000
      });
    } else if (source.startsWith('http')) {
      // Direct URL - download
      throw new Error('Direct URL installation not yet implemented');
    } else {
      // Git repository
      await execa('git', ['clone', '--depth', '1', source, pluginDir], {
        timeout: 60000
      });
    }
    
    // Load and return the installed plugin
    const plugin = await loadPlugin(pluginName);
    if (!plugin) {
      throw new Error('Plugin installed but manifest could not be loaded');
    }
    
    return plugin;
  } catch (error: any) {
    // Clean up on failure
    try {
      await rm(pluginDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

// Uninstall plugin
export async function uninstallPlugin(name: string): Promise<void> {
  const pluginDir = getPluginDir(name);
  
  if (!await isPluginInstalled(name)) {
    throw new Error(`Plugin ${name} is not installed`);
  }
  
  await rm(pluginDir, { recursive: true });
}

// Update plugin
export async function updatePlugin(name: string): Promise<Plugin> {
  if (!await isPluginInstalled(name)) {
    throw new Error(`Plugin ${name} is not installed`);
  }
  
  // For npm-installed plugins, run npm update
  const pluginDir = getPluginDir(name);
  
  try {
    await execa('npm', ['update'], { cwd: pluginDir, timeout: 60000 });
  } catch {
    // npm update might fail for git clones, that's ok
  }
  
  const plugin = await loadPlugin(name);
  if (!plugin) {
    throw new Error('Failed to reload plugin after update');
  }
  
  return plugin;
}

// Execute a plugin command
export async function executePlugin(
  pluginName: string,
  command: string,
  args: string[] = []
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const plugin = await loadPlugin(pluginName);
  
  if (!plugin) {
    throw new Error(`Plugin ${pluginName} not found`);
  }
  
  if (!plugin.commands.includes(command)) {
    throw new Error(`Command ${command} not found in plugin ${pluginName}`);
  }
  
  try {
    const result = await execa('node', [plugin.entry, command, ...args], {
      cwd: process.cwd(),
      timeout: 30000
    });
    
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: 0
    };
  } catch (error: any) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      exitCode: error.exitCode || 1
    };
  }
}

// Search for available plugins (from registry)
export async function searchPlugins(query?: string): Promise<Array<{
  name: string;
  version: string;
  description: string;
  author: string;
  installs: number;
}>> {
  // In a real implementation, this would query a registry API
  // For now, return some example plugins
  
  const examplePlugins = [
    {
      name: '@hermes-forge/plugin-deploy',
      version: '1.0.0',
      description: 'Deploy Forge packs to remote servers',
      author: 'hermes-team',
      installs: 42
    },
    {
      name: '@hermes-forge/plugin-analytics',
      version: '0.9.0',
      description: 'Analytics and usage tracking for packs',
      author: 'hermes-team',
      installs: 28
    },
    {
      name: 'forge-plugin-llm',
      version: '2.1.0',
      description: 'LLM integration for pack generation',
      author: 'community',
      installs: 156
    }
  ];
  
  if (query) {
    return examplePlugins.filter(p => 
      p.name.includes(query) || 
      p.description.toLowerCase().includes(query.toLowerCase())
    );
  }
  
  return examplePlugins;
}

// Get plugin manifest
export async function getPluginManifest(name: string): Promise<PluginManifest | null> {
  const pluginDir = getPluginDir(name);
  
  try {
    const content = await readFile(join(pluginDir, 'package.json'), 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// Validate plugin structure
export async function validatePlugin(pluginDir: string): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  
  // Check for package.json
  if (!existsSync(join(pluginDir, 'package.json'))) {
    errors.push('Missing package.json');
  }
  
  // Check for entry point
  if (!existsSync(join(pluginDir, 'index.js')) && 
      !existsSync(join(pluginDir, 'index.ts'))) {
    errors.push('Missing entry point (index.js or index.ts)');
  }
  
  // Validate manifest if exists
  try {
    const manifest = await getPluginManifest(pluginDir);
    if (manifest) {
      if (!manifest.name) errors.push('Manifest missing name');
      if (!manifest.version) errors.push('Manifest missing version');
      if (!manifest.main) errors.push('Manifest missing main entry');
      if (!manifest.commands || manifest.commands.length === 0) {
        errors.push('Manifest missing commands');
      }
    }
  } catch (e) {
    errors.push('Invalid package.json');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
