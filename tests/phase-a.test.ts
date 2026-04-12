import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execa } from 'execa';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { existsSync } from 'fs';
import { mkdir, writeFile, rm } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Vitest may virtualize import.meta.url; prefer cwd-based paths that exist. */
function resolveCliEntry(): string {
  const fromTestFile = join(__dirname, '..', 'dist', 'index.js');
  const fromRepoRoot = join(process.cwd(), 'cli', 'dist', 'index.js');
  const fromCliWorkspace = join(process.cwd(), 'dist', 'index.js');
  if (existsSync(fromRepoRoot)) return fromRepoRoot;
  if (existsSync(fromCliWorkspace)) return fromCliWorkspace;
  if (existsSync(fromTestFile)) return fromTestFile;
  return fromRepoRoot;
}

const CLI_PATH = resolveCliEntry();
const FORGE_DIR = join(homedir(), '.forge');
const PIDS_DIR = join(FORGE_DIR, 'pids');
const LOGS_DIR = join(FORGE_DIR, 'logs');

// Helper to run CLI commands
async function runForge(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const result = await execa('node', [CLI_PATH, ...args], {
      cwd: process.cwd(),
      timeout: 30000
    });
    return { stdout: result.stdout, stderr: result.stderr, exitCode: 0 };
  } catch (error: any) {
    return { 
      stdout: error.stdout || '', 
      stderr: error.stderr || '', 
      exitCode: error.exitCode || 1 
    };
  }
}

describe('Phase A: Core Stability Systems', () => {
  beforeAll(async () => {
    // Ensure test directories exist
    await mkdir(PIDS_DIR, { recursive: true });
    await mkdir(LOGS_DIR, { recursive: true });
  });

  afterAll(async () => {
    // Cleanup test files
    try {
      await rm(PIDS_DIR, { recursive: true });
      await rm(LOGS_DIR, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('System 1: Lock-File System', () => {
    it('should create and read lock files', async () => {
      const lock = await import('../dist/lib/lockManager.js');
      
      // Create a test lock
      await lock.acquireLock('test-service', 12345, 8080, 'test command');
      
      // Read it back
      const info = await lock.getLock('test-service');
      expect(info).toBeTruthy();
      expect(info?.service).toBe('test-service');
      expect(info?.pid).toBe(12345);
      expect(info?.port).toBe(8080);
      
      // Clean up
      await lock.releaseLock('test-service');
    });

    it('should detect stale locks', async () => {
      const lock = await import('../dist/lib/lockManager.js');
      
      // Create a lock with a non-existent PID (1 is init, always exists)
      // Use a very high PID that's unlikely to exist
      const fakePid = 99999;
      await lock.acquireLock('stale-test', fakePid, 8080, 'test');
      
      // Check if lock is valid (should be false since PID doesn't exist)
      const isValid = await lock.isLockValid('stale-test');
      expect(isValid).toBe(false);
      
      // Clear stale locks
      const cleared = await lock.clearStaleLocks();
      expect(cleared).toContain('stale-test');
    });

    it('should prevent duplicate locks', async () => {
      const lock = await import('../dist/lib/lockManager.js');
      
      // Create first lock
      await lock.acquireLock('dup-test', process.pid, 8080, 'test');
      
      // Try to create duplicate (should fail since process.pid is valid)
      await expect(
        lock.acquireLock('dup-test', 12345, 8080, 'test2')
      ).rejects.toThrow(/already running/);
      
      // Clean up
      await lock.releaseLock('dup-test');
    });
  });

  describe('System 2: Environment Management', () => {
    const TEST_ENV_DIR = join(__dirname, 'env-test');
    
    beforeAll(async () => {
      await mkdir(TEST_ENV_DIR, { recursive: true });
      
      // Create test env files
      await writeFile(
        join(TEST_ENV_DIR, '.env.local'),
        'VITE_API_BASE=http://localhost:5181\nSECRET_KEY=local-secret\n'
      );
      await writeFile(
        join(TEST_ENV_DIR, '.env.staging'),
        'VITE_API_BASE=https://staging.example.com\nSECRET_KEY=staging-secret\n'
      );
      await writeFile(
        join(TEST_ENV_DIR, '.env.example'),
        'VITE_API_BASE=\nSECRET_KEY=\nOPTIONAL_VAR=\n'
      );
    });

    afterAll(async () => {
      try {
        await rm(TEST_ENV_DIR, { recursive: true });
      } catch {
        // Ignore
      }
    });

    it('should list environments', async () => {
      const env = await import('../dist/lib/envManager.js');
      
      // Change to test directory
      const originalCwd = process.cwd();
      process.chdir(TEST_ENV_DIR);
      
      const envs = await env.listEnvironments();
      expect(envs).toContain('local');
      expect(envs).toContain('staging');
      
      process.chdir(originalCwd);
    });

    it('should load environment files', async () => {
      const env = await import('../dist/lib/envManager.js');
      
      const originalCwd = process.cwd();
      process.chdir(TEST_ENV_DIR);
      
      const loaded = await env.loadEnv('local');
      expect(loaded.VITE_API_BASE).toBe('http://localhost:5181');
      expect(loaded.SECRET_KEY).toBe('local-secret');
      
      process.chdir(originalCwd);
    });

    it('should mask secrets', async () => {
      const env = await import('../dist/lib/envManager.js');
      
      const vars = { SECRET_KEY: 'my-secret-value', PUBLIC_VAR: 'public' };
      const masked = env.maskSecrets(vars);
      
      expect(masked.SECRET_KEY).toContain('*');
      expect(masked.SECRET_KEY).not.toBe('my-secret-value');
      expect(masked.PUBLIC_VAR).toBe('public');
    });

    it('should validate environments', async () => {
      const env = await import('../dist/lib/envManager.js');
      
      const originalCwd = process.cwd();
      process.chdir(TEST_ENV_DIR);
      
      const validation = await env.validateEnv('local');
      expect(validation.missing).toContain('OPTIONAL_VAR');
      expect(validation.valid).toBe(false);
      
      process.chdir(originalCwd);
    });

    it('should diff environments', async () => {
      const env = await import('../dist/lib/envManager.js');
      
      const originalCwd = process.cwd();
      process.chdir(TEST_ENV_DIR);
      
      const diff = await env.diffEnvironments('local', 'staging');
      expect(diff.different).toHaveLength(2); // Both API_BASE and SECRET_KEY differ
      
      process.chdir(originalCwd);
    });
  });

  describe('System 3: Basic Logging', () => {
    it('should create and read log files', async () => {
      const logger = await import('../dist/lib/logger.js');
      
      // Create a logger for test service
      const log = logger.createLogger('test-service');
      
      // Write some logs
      await log.info('Test info message');
      await log.error('Test error message');
      
      // Read them back
      const logs = await logger.readLogs('test-service', 10);
      expect(logs.length).toBeGreaterThanOrEqual(2);
      
      // Check structure
      const infoLog = logs.find(l => l.message === 'Test info message');
      expect(infoLog).toBeTruthy();
      expect(infoLog?.level).toBe('info');
      
      // Clean up
      await logger.clearLogs('test-service');
    });

    it('should format log entries correctly', async () => {
      const logger = await import('../dist/lib/logger.js');
      
      const logPath = logger.getLogFilePath('test');
      expect(logPath).toContain('.forge/logs/test.log');
    });
  });

  describe('System 4: MCP Commands', () => {
    it('should detect MCP registry installation', async () => {
      const mcp = await import('../dist/lib/mcpManager.js');
      
      const installed = await mcp.isMcpRegistryInstalled();
      // This will depend on the actual file system state
      // Just verify the function runs without error
      expect(typeof installed).toBe('boolean');
    });

    it('should construct MCP URLs correctly', async () => {
      const mcp = await import('../dist/lib/mcpManager.js');
      
      const baseUrl = mcp.getMcpBaseUrl(5200);
      expect(baseUrl).toBe('http://127.0.0.1:5200');
      
      const defaultUrl = mcp.getMcpBaseUrl();
      expect(defaultUrl).toContain('http://127.0.0.1:');
    });
  });

  describe('CLI Integration Tests', () => {
    it('should show status with --json flag', async () => {
      const result = await runForge(['status', '--json']);
      expect(result.exitCode).toBe(0);
      
      const output = JSON.parse(result.stdout);
      expect(output).toHaveProperty('services');
      expect(output).toHaveProperty('wsl');
      expect(output).toHaveProperty('timestamp');
      expect(Array.isArray(output.services)).toBe(true);
    });

    it('should show doctor output', async () => {
      const result = await runForge(['doctor']);
      expect(result.exitCode).toBe(0);
      // Non-TTY (execa pipe) makes doctor emit JSON instead of "Forge Doctor" banner
      const trimmed = result.stdout.trimStart();
      if (trimmed.startsWith('{')) {
        const parsed = JSON.parse(result.stdout) as { success?: boolean };
        expect(parsed.success).toBe(true);
      } else {
        expect(result.stdout).toContain('Forge Doctor');
      }
    });

    it('should show help for all commands', async () => {
      const commands = ['status', 'doctor', 'dev', 'docs', 'open', 'pack', 'config', 'env', 'logs', 'mcp'];
      
      for (const cmd of commands) {
        const result = await runForge([cmd, '--help']);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Usage:');
      }
    });
  });
});
