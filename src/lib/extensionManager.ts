/**
 * Forge CLI — Extension Manager
 *
 * Loads, validates, and injects extensions from ~/.forge/extensions/ and .forge/extensions/
 * Modeled after OpenClaw's extension system.
 */
import { readdirSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import * as yaml from 'js-yaml';
const parseYaml = yaml.load;
import { Command } from 'commander';
import chalk from 'chalk';
import type { ExtensionManifest, ExtensionEntry, ExtensionCommand, HookName } from '../types.js';

const USER_EXT_DIR = join(homedir(), '.forge', 'extensions');
const PROJECT_EXT_DIR = '.forge/extensions';

/** ─── Discovery ─── */

function discoverExtensionDirs(): string[] {
  const dirs: string[] = [];

  // User-level extensions
  if (existsSync(USER_EXT_DIR)) {
    const entries = readdirSync(USER_EXT_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        dirs.push(join(USER_EXT_DIR, entry.name));
      }
    }
  }

  // Project-level extensions
  if (existsSync(PROJECT_EXT_DIR)) {
    const entries = readdirSync(PROJECT_EXT_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = resolve(PROJECT_EXT_DIR, entry.name);
        // Skip if already loaded from user dir (user overrides project)
        if (!dirs.some(d => d.endsWith(entry.name))) {
          dirs.push(fullPath);
        }
      }
    }
  }

  return dirs;
}

/** ─── Manifest Loading ─── */

function loadManifest(extDir: string): ExtensionManifest | null {
  const yamlPath = join(extDir, 'manifest.yaml');
  const ymlPath = join(extDir, 'manifest.yml');
  const jsonPath = join(extDir, 'manifest.json');

  let raw: string;
  let filePath: string;

  if (existsSync(yamlPath)) {
    raw = readFileSync(yamlPath, 'utf-8');
    filePath = yamlPath;
  } else if (existsSync(ymlPath)) {
    raw = readFileSync(ymlPath, 'utf-8');
    filePath = ymlPath;
  } else if (existsSync(jsonPath)) {
    raw = readFileSync(jsonPath, 'utf-8');
    filePath = jsonPath;
  } else {
    return null;
  }

  try {
    const parsed = filePath.endsWith('.json') ? JSON.parse(raw) : parseYaml(raw) as any;
    if (!parsed.name || typeof parsed.name !== 'string') {
      console.warn(chalk.yellow(`⚠ Extension manifest missing 'name': ${filePath}`));
      return null;
    }
    return {
      name: parsed.name,
      version: parsed.version || '0.0.0',
      description: parsed.description,
      commands: parsed.commands || [],
      hooks: parsed.hooks,
      dependencies: parsed.dependencies,
    };
  } catch (err: any) {
    console.warn(chalk.yellow(`⚠ Failed to parse manifest: ${filePath} — ${err.message}`));
    return null;
  }
}

/** ─── Extension Registry (singleton) ─── */

let _extensions: ExtensionEntry[] | null = null;

/**
 * Load all extensions from disk
 */
export function loadExtensions(): ExtensionEntry[] {
  if (_extensions) return _extensions;

  const dirs = discoverExtensionDirs();
  const result: ExtensionEntry[] = [];

  for (const dir of dirs) {
    const manifest = loadManifest(dir);
    if (manifest) {
      // Check for name conflicts
      const existing = result.find(e => e.manifest.name === manifest.name);
      if (existing) {
        console.warn(chalk.yellow(`⚠ Extension '${manifest.name}' already loaded from ${existing.dir}. Skipping ${dir}`));
        continue;
      }
      result.push({ manifest, dir, enabled: true });
    }
  }

  _extensions = result;
  return result;
}

/**
 * Clear extension cache (for reload)
 */
export function clearExtensionCache(): void {
  _extensions = null;
}

/** ─── Command Injection ─── */

/**
 * Register extension commands on a Commander program
 */
export function injectExtensionCommands(program: Command): void {
  const extensions = loadExtensions();

  for (const ext of extensions) {
    if (!ext.enabled || !ext.manifest.commands?.length) continue;
    const { name: extName } = ext.manifest;

    for (const cmd of ext.manifest.commands) {
      const cmdName = `ext-${extName}:${cmd.name}`;

      const sub = program.command(cmdName)
        .description(`[ext:${extName}] ${cmd.description}`)
        .allowUnknownOption()
        .action(async (...args: any[]) => {
          try {
            const modulePath = resolve(ext.dir, cmd.module);
            const mod = await import(modulePath);
            const handler = mod.default || mod.handler;
            if (typeof handler === 'function') {
              await handler(...args);
            } else {
              console.warn(chalk.yellow(`⚠ Extension '${extName}' command '${cmd.name}' has no default export or handler`));
            }
          } catch (err: any) {
            console.error(chalk.red(`✗ Extension '${extName}' command '${cmd.name}' failed:`), err.message);
          }
        });

      if (cmd.aliases?.length) {
        for (const alias of cmd.aliases) {
          sub.alias(`ext-${extName}:${alias}`);
        }
      }
    }
  }
}

/** ─── Hook Dispatch ─── */

/**
 * Run a specific hook across all enabled extensions
 */
export async function runHook(hookName: HookName, context?: any): Promise<void> {
  const extensions = loadExtensions();

  for (const ext of extensions) {
    if (!ext.enabled) continue;
    const hookPath = ext.manifest.hooks?.[hookName];
    if (!hookPath) continue;

    try {
      const modulePath = resolve(ext.dir, hookPath);
      const mod = await import(modulePath);
      const handler = mod.default || mod.handler;
      if (typeof handler === 'function') {
        await handler(context);
      }
    } catch (err: any) {
      console.warn(chalk.yellow(`⚠ Extension '${ext.manifest.name}' hook '${hookName}' failed: ${err.message}`));
    }
  }
}

/** ─── Utility Functions ─── */

/**
 * Check if an extension is installed
 */
export function isExtensionInstalled(name: string): boolean {
  const userDir = join(USER_EXT_DIR, name);
  const projectDir = join(PROJECT_EXT_DIR, name);
  return existsSync(userDir) && existsSync(join(userDir, 'manifest.yaml'))
    || existsSync(projectDir) && existsSync(join(projectDir, 'manifest.yaml'));
}

/**
 * Get count of installed extensions
 */
export function extensionCount(): number {
  return loadExtensions().length;
}

/**
 * Initialize extension directories if they don't exist
 */
export function ensureExtensionDirs(): void {
  if (!existsSync(USER_EXT_DIR)) {
    mkdirSync(USER_EXT_DIR, { recursive: true });
  }
}

/**
 * Get user extension directory path
 */
export function getUserExtensionDir(): string {
  return USER_EXT_DIR;
}

/**
 * Get project extension directory path
 */
export function getProjectExtensionDir(): string {
  return resolve(PROJECT_EXT_DIR);
}
