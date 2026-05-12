import { execa, execaSync } from 'execa';
import { config } from './configManager.js';
import {
  acquireLock,
  releaseLock,
  isLockValid,
  getLock,
  type LockInfo
} from './lockManager.js';
import { createLogger } from './logger.js';
import { checkHealth } from './healthCheck.js';

const MCP_SERVICE_NAME = 'forge-mcp';
const MCP_SYSTEMD_UNIT = 'hermes-forge-mcp.service';
const DEFAULT_MCP_PORT = 8641;
const MCP_PROJECT_DIR = '/home/ubuntu/projects/hermes-forge-mcp';

/** Checks if MCP HTTP server is reachable (non-systemd fallback). */
async function isMcpHttpReachable(port?: number): Promise<boolean> {
  const url = getMcpBaseUrl(port);
  try {
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function getMcpRegistryPath(): string {
  return MCP_PROJECT_DIR;
}

export function getMcpDefaultPort(): number {
  return DEFAULT_MCP_PORT;
}

export function getMcpBaseUrl(port?: number): string {
  return `http://127.0.0.1:${port || getMcpDefaultPort()}`;
}

export async function isMcpRegistryInstalled(): Promise<boolean> {
  try {
    const { stdout } = await execa('systemctl', ['is-enabled', MCP_SYSTEMD_UNIT]);
    return stdout.trim() === 'enabled';
  } catch {
    return false;
  }
}

export async function isMcpRunning(port?: number): Promise<boolean> {
  // Try systemd first
  try {
    const { stdout } = await execa('systemctl', ['is-active', MCP_SYSTEMD_UNIT]);
    if (stdout.trim() === 'active') return true;
  } catch {
    // systemd not available — fallback to HTTP health check
  }
  return isMcpHttpReachable(port);
}

export interface McpStartResult {
  pid: number;
  port: number;
  url: string;
}

export async function startMcpRegistry(port?: number): Promise<McpStartResult> {
  const actualPort = port || getMcpDefaultPort();
  const url = getMcpBaseUrl(actualPort);
  const logger = createLogger('mcp');

  // Check if already running
  const running = await isMcpRunning(actualPort);
  if (running) {
    throw new Error(`MCP server already running on port ${actualPort}`);
  }

  // Start via systemd
  await execa('sudo', ['systemctl', 'start', MCP_SYSTEMD_UNIT]);

  // Wait for health check (up to 10 seconds)
  let healthy = false;
  let pid = 0;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    const health = await checkHealth(`${url}/health`);
    if (health.status === 'up') {
      healthy = true;
      // Get PID from systemd
      try {
        const { stdout } = await execa('systemctl', ['show', '--property=MainPID', '--value', MCP_SYSTEMD_UNIT]);
        pid = parseInt(stdout.trim(), 10);
      } catch { /* ignore */ }
      break;
    }
  }

  if (!healthy) {
    throw new Error('MCP server failed to start via systemd: health check timeout');
  }

  // Acquire lock for PID tracking
  if (pid) {
    await acquireLock(MCP_SERVICE_NAME, pid, actualPort, `systemd:${MCP_SYSTEMD_UNIT}`);
  }

  await logger.info(`MCP server started on port ${actualPort} (PID: ${pid})`);

  return { pid, port: actualPort, url };
}

export async function stopMcpRegistry(): Promise<boolean> {
  const logger = createLogger('mcp');

  try {
    await execa('sudo', ['systemctl', 'stop', MCP_SYSTEMD_UNIT]);

    // Wait up to 5 seconds for stop
    for (let i = 0; i < 25; i++) {
      await new Promise(r => setTimeout(r, 200));
      const running = await isMcpRunning();
      if (!running) {
        await releaseLock(MCP_SERVICE_NAME);
        await logger.info(`MCP server stopped`);
        return true;
      }
    }

    // Force kill if still running
    await execa('sudo', ['systemctl', 'kill', MCP_SYSTEMD_UNIT]);
    await releaseLock(MCP_SERVICE_NAME);
    await logger.info(`MCP server force killed`);
    return true;
  } catch (error) {
    await logger.error(`Failed to stop MCP server: ${error}`);
    return false;
  }
}

export async function checkMcpHealth(port?: number): Promise<{ ok: boolean; responseTime: number; error?: string }> {
  const url = getMcpBaseUrl(port);
  const result = await checkHealth(`${url}/health`);

  return {
    ok: result.status === 'up',
    responseTime: result.responseTime || 0,
    error: result.message
  };
}

/**
 * Fetch the list of MCP tool names via the /health/tools endpoint.
 * This avoids the MCP Streamable HTTP handshake (initialize → tools/list)
 * which requires specific Accept headers and session state.
 *
 * Distinguishes:
 *  - server down → throws "Connection refused"
 *  - HTTP error  → returns error detail
 *  - success     → returns tool name array
 */
export async function listMcpTools(port?: number): Promise<{ tools: string[]; error?: string }> {
  const url = getMcpBaseUrl(port);

  try {
    const response = await fetch(`${url}/health/tools`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return { tools: [], error: `HTTP ${response.status}: ${response.statusText}${body ? ` — ${body.slice(0, 200)}` : ''}` };
    }

    const result = await response.json();
    const tools = result?.tools;
    if (!Array.isArray(tools)) {
      return { tools: [], error: 'Unexpected response shape from /health/tools' };
    }
    return { tools: tools.map((t: any) => t.name || String(t)) };
  } catch (err: any) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      return { tools: [], error: 'Connection timed out after 5s' };
    }
    if (err?.cause?.code === 'ECONNREFUSED') {
      return { tools: [], error: 'Connection refused — server is down' };
    }
    return { tools: [], error: err?.message ?? 'Unknown error' };
  }
}

export interface McpTestResult {
  success: boolean;
  result?: any;
  error?: string;
  duration: number;
}

export async function testMcpTool(
  toolName: string,
  params: object = {},
  port?: number
): Promise<McpTestResult> {
  const url = getMcpBaseUrl(port);
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${url}/tools/${toolName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: controller.signal
    });

    clearTimeout(timeout);

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
        duration
      };
    }

    const result = await response.json();
    return {
      success: true,
      result,
      duration
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown error',
      duration: Date.now() - startTime
    };
  }
}

export async function getMcpStatus(port?: number): Promise<{
  running: boolean;
  pid?: number;
  port: number;
  url: string;
  uptime?: number;
  tools: string[];
  toolsError?: string;
} | null> {
  const actualPort = port || getMcpDefaultPort();
  const url = getMcpBaseUrl(actualPort);

  const running = await isMcpRunning(actualPort);

  let tools: string[] = [];
  let toolsError: string | undefined;
  if (running) {
    const result = await listMcpTools(actualPort);
    tools = result.tools;
    toolsError = result.error;
  }

  let uptime: number | undefined;
  if (running) {
    try {
      const { stdout } = await execa('systemctl', ['show', '--property=ActiveEnterTimestamp', '--value', MCP_SYSTEMD_UNIT]);
      if (stdout.trim()) {
        uptime = Date.now() - new Date(stdout.trim()).getTime();
      }
    } catch { /* ignore */ }
  }

  let pid: number | undefined;
  if (running) {
    try {
      const { stdout } = await execa('systemctl', ['show', '--property=MainPID', '--value', MCP_SYSTEMD_UNIT]);
      pid = parseInt(stdout.trim(), 10) || undefined;
    } catch { /* ignore */ }
  }

  return {
    running,
    pid,
    port: actualPort,
    url,
    uptime,
    tools,
    toolsError,
  };
}
