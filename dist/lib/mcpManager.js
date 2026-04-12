import { execa } from 'execa';
import { join } from 'path';
import { access } from 'fs/promises';
import { config } from './configManager.js';
import { acquireLock, releaseLock, isLockValid, getLock } from './lockManager.js';
import { createLogger } from './logger.js';
import { checkHealth } from './healthCheck.js';
const MCP_SERVICE_NAME = 'mcp';
export function getMcpRegistryPath() {
    return join(process.cwd(), 'integrations', 'mcp-forge-registry');
}
export function getMcpDefaultPort() {
    return config.get().ports.mcp;
}
export function getMcpBaseUrl(port) {
    return `http://127.0.0.1:${port || getMcpDefaultPort()}`;
}
export function getMcpPythonRuntime() {
    return config.get().mcpRegistry?.pythonRuntime || 'uv';
}
export async function isMcpRegistryInstalled() {
    try {
        const registryPath = getMcpRegistryPath();
        await access(join(registryPath, 'pyproject.toml'));
        return true;
    }
    catch {
        return false;
    }
}
export async function isMcpRunning(port) {
    // Check lock first
    const hasLock = await isLockValid(MCP_SERVICE_NAME);
    if (!hasLock) {
        return false;
    }
    // Then check health
    const url = getMcpBaseUrl(port);
    const health = await checkHealth(`${url}/health`);
    return health.status === 'up';
}
export async function startMcpRegistry(port) {
    const actualPort = port || getMcpDefaultPort();
    const runtime = getMcpPythonRuntime();
    const registryPath = getMcpRegistryPath();
    const logger = createLogger('mcp');
    // Check if already running
    const running = await isMcpRunning(actualPort);
    if (running) {
        const lock = await getLock(MCP_SERVICE_NAME);
        throw new Error(`MCP registry already running (PID ${lock?.pid || 'unknown'})`);
    }
    // Build command based on runtime
    let command;
    let args;
    if (runtime === 'uv') {
        command = 'uv';
        args = ['run', 'python', '-m', 'forge_mcp_registry'];
    }
    else {
        command = runtime; // python3 or python
        args = ['-m', 'forge_mcp_registry'];
    }
    // Spawn the process
    const childProcess = execa(command, args, {
        cwd: registryPath,
        detached: false,
        env: {
            ...process.env,
            FORGE_MCP_PORT: actualPort.toString()
        }
    });
    if (!childProcess.pid) {
        throw new Error('Failed to start MCP registry: no PID');
    }
    // Acquire lock
    await acquireLock(MCP_SERVICE_NAME, childProcess.pid, actualPort, `${command} ${args.join(' ')}`);
    // Wait for health check (up to 10 seconds)
    const url = getMcpBaseUrl(actualPort);
    let healthy = false;
    for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 500));
        const health = await checkHealth(`${url}/health`);
        if (health.status === 'up') {
            healthy = true;
            break;
        }
    }
    if (!healthy) {
        // Clean up on failure
        childProcess.kill();
        await releaseLock(MCP_SERVICE_NAME);
        throw new Error('MCP registry failed to start: health check timeout');
    }
    await logger.info(`MCP registry started on port ${actualPort} (PID: ${childProcess.pid})`);
    return {
        pid: childProcess.pid,
        port: actualPort,
        url
    };
}
export async function stopMcpRegistry() {
    const lock = await getLock(MCP_SERVICE_NAME);
    if (!lock) {
        return false;
    }
    const logger = createLogger('mcp');
    // Try SIGTERM first
    try {
        process.kill(lock.pid, 'SIGTERM');
    }
    catch {
        // Process might already be dead
    }
    // Wait up to 5 seconds for graceful shutdown
    let stopped = false;
    for (let i = 0; i < 25; i++) {
        await new Promise(r => setTimeout(r, 200));
        const stillRunning = await isLockValid(MCP_SERVICE_NAME);
        if (!stillRunning) {
            stopped = true;
            break;
        }
    }
    // Force kill if still running
    if (!stopped) {
        try {
            process.kill(lock.pid, 'SIGKILL');
        }
        catch {
            // Process might already be dead
        }
        await new Promise(r => setTimeout(r, 500));
    }
    // Release lock
    await releaseLock(MCP_SERVICE_NAME);
    await logger.info(`MCP registry stopped (PID: ${lock.pid})`);
    return true;
}
export async function checkMcpHealth(port) {
    const url = getMcpBaseUrl(port);
    const result = await checkHealth(`${url}/health`);
    return {
        ok: result.status === 'up',
        responseTime: result.responseTime || 0,
        error: result.message
    };
}
export async function listMcpTools(port) {
    const url = getMcpBaseUrl(port);
    try {
        const response = await fetch(`${url}/tools`);
        if (!response.ok) {
            return [];
        }
        const tools = await response.json();
        return Array.isArray(tools) ? tools.map((t) => t.name || t) : [];
    }
    catch {
        return [];
    }
}
export async function testMcpTool(toolName, params = {}, port) {
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
    }
    catch (error) {
        return {
            success: false,
            error: error.message || 'Unknown error',
            duration: Date.now() - startTime
        };
    }
}
export async function getMcpStatus(port) {
    const actualPort = port || getMcpDefaultPort();
    const url = getMcpBaseUrl(actualPort);
    const lock = await getLock(MCP_SERVICE_NAME);
    const running = await isMcpRunning(actualPort);
    const tools = running ? await listMcpTools(actualPort) : [];
    let uptime;
    if (lock && running) {
        const startTime = new Date(lock.startTime).getTime();
        uptime = Date.now() - startTime;
    }
    return {
        running,
        pid: lock?.pid,
        port: actualPort,
        url,
        uptime,
        tools
    };
}
//# sourceMappingURL=mcpManager.js.map