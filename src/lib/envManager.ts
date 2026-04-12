import { readFile, access, readdir } from 'fs/promises';
import { join } from 'path';
import { config } from './configManager.js';

export interface EnvDiff {
  onlyIn1: string[];
  onlyIn2: string[];
  different: Array<{ key: string; val1: string; val2: string }>;
}

export interface EnvValidation {
  valid: boolean;
  missing: string[];
  extra: string[];
}

const SECRET_PATTERNS = ['KEY', 'TOKEN', 'SECRET', 'PASSWORD', 'API_KEY', 'AUTH', 'PRIVATE'];

function getErrnoCode(error: unknown): string | undefined {
  return (error as NodeJS.ErrnoException).code;
}

export function isSecretKey(key: string): boolean {
  const upperKey = key.toUpperCase();
  return SECRET_PATTERNS.some(pattern => upperKey.includes(pattern));
}

export function maskValue(value: string): string {
  if (value.length <= 4) return '****';
  return value.slice(0, 2) + '*'.repeat(value.length - 4) + value.slice(-2);
}

export function maskSecrets(env: Record<string, string>): Record<string, string> {
  const masked: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    masked[key] = isSecretKey(key) ? maskValue(value) : value;
  }
  return masked;
}

export function parseEnvFile(content: string): Record<string, string> {
  const env: Record<string, string> = {};
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    // Remove export prefix if present
    const withoutExport = trimmed.startsWith('export ') 
      ? trimmed.slice(7) 
      : trimmed;
    
    // Find the first = sign
    const eqIndex = withoutExport.indexOf('=');
    if (eqIndex === -1) continue;
    
    const key = withoutExport.slice(0, eqIndex).trim();
    let value = withoutExport.slice(eqIndex + 1).trim();
    
    // Remove inline comments (when not inside quotes)
    if (!value.startsWith('"') && !value.startsWith("'")) {
      const hashIndex = value.indexOf(' #');
      if (hashIndex !== -1) {
        value = value.slice(0, hashIndex).trim();
      }
    }
    
    // Remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    env[key] = value;
  }
  
  return env;
}

export function getEnvFilePath(environment: string): string {
  return join(process.cwd(), `.env.${environment}`);
}

export async function loadEnv(environment: string): Promise<Record<string, string>> {
  const path = getEnvFilePath(environment);
  try {
    const content = await readFile(path, 'utf8');
    return parseEnvFile(content);
  } catch (error: unknown) {
    if (getErrnoCode(error) === 'ENOENT') {
      throw new Error(`Environment file not found: .env.${environment}`);
    }
    throw error;
  }
}

export function getActiveEnv(): string {
  return config.get().activeEnvironment || 'local';
}

export function setActiveEnv(environment: string): void {
  config.set('activeEnvironment', environment);
}

export async function listEnvironments(): Promise<string[]> {
  const envs: string[] = [];
  
  try {
    const files = await readdir(process.cwd());
    for (const file of files) {
      // Match .env.<name> files, excluding .env.example and .env.<name>.local overrides
      if (file.startsWith('.env.') && !file.endsWith('.example')) {
        const afterPrefix = file.slice(5); // Remove '.env.' prefix
        // Don't include files that look like .env.name.local (local overrides)
        const parts = afterPrefix.split('.');
        const env = parts[0];
        if (env && (parts.length === 1 || parts[1] === 'local')) {
          envs.push(env);
        }
      }
    }
  } catch {
    // Ignore errors
  }
  
  // Remove duplicates and sort
  return [...new Set(envs)].sort();
}

export async function validateEnv(environment: string): Promise<EnvValidation> {
  const envPath = getEnvFilePath(environment);
  const examplePath = join(process.cwd(), '.env.example');
  
  try {
    await access(envPath);
  } catch {
    return { valid: false, missing: ['FILE_NOT_FOUND'], extra: [] };
  }
  
  const env = await loadEnv(environment);
  
  let example: Record<string, string>;
  try {
    const exampleContent = await readFile(examplePath, 'utf8');
    example = parseEnvFile(exampleContent);
  } catch {
    // No example file, assume env is valid
    return { valid: true, missing: [], extra: [] };
  }
  
  const envKeys = Object.keys(env);
  const exampleKeys = Object.keys(example);
  
  const missing = exampleKeys.filter(key => !envKeys.includes(key));
  const extra = envKeys.filter(key => !exampleKeys.includes(key));
  
  return {
    valid: missing.length === 0,
    missing,
    extra
  };
}

export async function diffEnvironments(env1: string, env2: string): Promise<EnvDiff> {
  const [vars1, vars2] = await Promise.all([
    loadEnv(env1),
    loadEnv(env2)
  ]);
  
  const keys1 = Object.keys(vars1);
  const keys2 = Object.keys(vars2);
  
  const onlyIn1 = keys1.filter(k => !keys2.includes(k));
  const onlyIn2 = keys2.filter(k => !keys1.includes(k));
  const inBoth = keys1.filter(k => keys2.includes(k));
  
  const different = inBoth
    .filter(key => vars1[key] !== vars2[key])
    .map(key => ({
      key,
      val1: vars1[key],
      val2: vars2[key]
    }));
  
  return { onlyIn1, onlyIn2, different };
}

export function getMaskedVariables(env: Record<string, string>): Array<{ key: string; value: string; masked: boolean }> {
  return Object.entries(env).map(([key, value]) => ({
    key,
    value: isSecretKey(key) ? maskValue(value) : value,
    masked: isSecretKey(key)
  }));
}

export function formatEnvForDisplay(env: Record<string, string>, raw = false): Array<{ key: string; value: string }> {
  const display = raw ? env : maskSecrets(env);
  return Object.entries(display).map(([key, value]) => ({ key, value }));
}
