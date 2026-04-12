import { writeFile, readFile, unlink, mkdir, access } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
const FORGE_DIR = join(homedir(), '.forge');
const PIDS_DIR = join(FORGE_DIR, 'pids');
async function ensurePidsDir() {
    try {
        await access(FORGE_DIR);
    }
    catch {
        await mkdir(FORGE_DIR, { recursive: true });
    }
    try {
        await access(PIDS_DIR);
    }
    catch {
        await mkdir(PIDS_DIR, { recursive: true });
    }
}
function getLockPath(service) {
    return join(PIDS_DIR, `${service}.json`);
}
async function isProcessAlive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    }
    catch {
        return false;
    }
}
export async function acquireLock(service, pid, port, command) {
    await ensurePidsDir();
    const existingLock = await getLock(service);
    if (existingLock) {
        const isAlive = await isProcessAlive(existingLock.pid);
        if (isAlive) {
            throw new Error(`Service "${service}" is already running (PID ${existingLock.pid}). ` +
                `Use 'forge status' to see all running services or 'forge dev --force' to override.`);
        }
        // Stale lock, remove it
        await releaseLock(service);
    }
    const lockInfo = {
        service,
        pid,
        port,
        startTime: new Date().toISOString(),
        command,
        restartCount: 0,
        status: 'running'
    };
    await writeFile(getLockPath(service), JSON.stringify(lockInfo, null, 2));
}
export async function releaseLock(service) {
    try {
        await unlink(getLockPath(service));
    }
    catch (error) {
        if (error.code !== 'ENOENT') {
            throw error;
        }
        // Ignore if file doesn't exist
    }
}
export async function getLock(service) {
    try {
        const content = await readFile(getLockPath(service), 'utf8');
        return JSON.parse(content);
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            return null;
        }
        throw error;
    }
}
export async function getAllLocks() {
    await ensurePidsDir();
    try {
        const { readdir } = await import('fs/promises');
        const files = await readdir(PIDS_DIR);
        const locks = [];
        for (const file of files) {
            if (file.endsWith('.json')) {
                const service = file.replace('.json', '');
                const lock = await getLock(service);
                if (lock) {
                    locks.push(lock);
                }
            }
        }
        return locks;
    }
    catch {
        return [];
    }
}
export async function isLockValid(service) {
    const lock = await getLock(service);
    if (!lock) {
        return false;
    }
    return await isProcessAlive(lock.pid);
}
export async function clearStaleLocks() {
    const locks = await getAllLocks();
    const cleared = [];
    for (const lock of locks) {
        const isAlive = await isProcessAlive(lock.pid);
        if (!isAlive) {
            await releaseLock(lock.service);
            cleared.push(lock.service);
        }
    }
    return cleared;
}
export async function updateLockStatus(service, status) {
    const lock = await getLock(service);
    if (lock) {
        lock.status = status;
        await writeFile(getLockPath(service), JSON.stringify(lock, null, 2));
    }
}
export async function incrementRestartCount(service) {
    const lock = await getLock(service);
    if (lock) {
        lock.restartCount = (lock.restartCount || 0) + 1;
        await writeFile(getLockPath(service), JSON.stringify(lock, null, 2));
        return lock.restartCount;
    }
    return 0;
}
//# sourceMappingURL=lockManager.js.map