import { execa } from 'execa';
export async function isProcessRunning(pid) {
    try {
        process.kill(pid, 0);
        return true;
    }
    catch {
        return false;
    }
}
export async function getProcessInfo(pid) {
    try {
        // Try to read from /proc filesystem (Linux)
        const { readFile } = await import('fs/promises');
        // Get command line
        const cmdline = await readFile(`/proc/${pid}/cmdline`, 'utf8').catch(() => null);
        const command = cmdline ? cmdline.replace(/\0/g, ' ').trim() : undefined;
        // Get start time from stat file
        const stat = await readFile(`/proc/${pid}/stat`, 'utf8').catch(() => null);
        let startTime;
        if (stat) {
            // Parse stat file - start time is field 22 (in clock ticks since boot)
            const parts = stat.split(' ');
            if (parts.length > 21) {
                const startTimeTicks = parseInt(parts[21], 10);
                // Convert to actual time (this is approximate)
                const uptime = await readFile('/proc/uptime', 'utf8').catch(() => '0');
                const systemUptimeSeconds = parseFloat(uptime.split(' ')[0]);
                const clockTicksPerSecond = 100; // Usually 100 on Linux
                const processUptimeSeconds = systemUptimeSeconds - (startTimeTicks / clockTicksPerSecond);
                startTime = new Date(Date.now() - processUptimeSeconds * 1000);
            }
        }
        if (command || startTime) {
            return { command, startTime };
        }
        // Fallback: try ps command
        const { stdout } = await execa('ps', ['-p', pid.toString(), '-o', 'comm='], { reject: false });
        if (stdout.trim()) {
            return { command: stdout.trim() };
        }
        return null;
    }
    catch {
        return null;
    }
}
export async function terminateProcess(pid, graceful = true) {
    try {
        const signal = graceful ? 'SIGTERM' : 'SIGKILL';
        process.kill(pid, signal);
    }
    catch (error) {
        if (error.code === 'ESRCH') {
            // Process doesn't exist, that's fine
            return;
        }
        throw error;
    }
}
export async function findProcessesByPort(port) {
    const processes = [];
    try {
        // Try ss first (modern Linux)
        const { stdout } = await execa('ss', ['-ltnp'], { reject: false, timeout: 5000 });
        const lines = stdout.split('\n');
        const seenPids = new Set();
        for (const line of lines) {
            if (line.includes(`:${port}`) && line.includes('users:')) {
                // Extract PID from users:(...)
                const pidMatch = line.match(/pid=(\d+)/);
                if (pidMatch) {
                    const pid = parseInt(pidMatch[1], 10);
                    if (!seenPids.has(pid)) {
                        seenPids.add(pid);
                        // Try to get command
                        const cmdMatch = line.match(/users:\(\("([^"]+)"/);
                        const command = cmdMatch ? cmdMatch[1] : 'unknown';
                        processes.push({ pid, command });
                    }
                }
            }
        }
        if (processes.length > 0) {
            return processes;
        }
    }
    catch {
        // ss failed, try lsof
    }
    try {
        // Fallback to lsof
        const { stdout } = await execa('lsof', ['-i', `:${port}`, '-P', '-n'], { reject: false, timeout: 5000 });
        const lines = stdout.split('\n').slice(1); // Skip header
        const seenPids = new Set();
        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 2) {
                const pid = parseInt(parts[1], 10);
                if (!isNaN(pid) && !seenPids.has(pid)) {
                    seenPids.add(pid);
                    const command = parts[0];
                    processes.push({ pid, command });
                }
            }
        }
    }
    catch {
        // Both commands failed
    }
    return processes;
}
export async function waitForProcessExit(pid, timeoutMs, pollIntervalMs = 200) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
        const isRunning = await isProcessRunning(pid);
        if (!isRunning) {
            return true;
        }
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
    return false; // Timeout reached
}
//# sourceMappingURL=processTracker.js.map