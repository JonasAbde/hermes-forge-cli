import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { config } from './configManager.js';
const LOCK_DIR = join(tmpdir(), 'forge-cli-locks');
function ensureLockDir() {
    if (!existsSync(LOCK_DIR)) {
        mkdirSync(LOCK_DIR, { recursive: true });
    }
}
function getLockFilePath(service) {
    return join(LOCK_DIR, `${service}.lock`);
}
function isProcessRunning(pid) {
    try {
        process.kill(pid, 0);
        return true;
    }
    catch {
        return false;
    }
}
export function isLockValid(service) {
    ensureLockDir();
    const lockPath = getLockFilePath(service);
    if (!existsSync(lockPath)) {
        return { valid: false };
    }
    try {
        const content = readFileSync(lockPath, 'utf-8');
        const info = JSON.parse(content);
        if (!isProcessRunning(info.pid)) {
            // Stale lock - clean it up
            try {
                unlinkSync(lockPath);
            }
            catch {
                // Ignore cleanup errors
            }
            return { valid: false };
        }
        return { valid: true, info };
    }
    catch {
        // Corrupted lock file - remove it
        try {
            unlinkSync(lockPath);
        }
        catch {
            // Ignore cleanup errors
        }
        return { valid: false };
    }
}
export function acquireLock(service, pid, metadata) {
    ensureLockDir();
    const lockPath = getLockFilePath(service);
    const lockInfo = {
        service,
        pid,
        startTime: new Date().toISOString(),
        command: metadata?.command,
        ports: metadata?.ports
    };
    writeFileSync(lockPath, JSON.stringify(lockInfo, null, 2), { mode: 0o644 });
}
export function releaseLock(service) {
    const lockPath = getLockFilePath(service);
    if (!existsSync(lockPath)) {
        return false;
    }
    try {
        unlinkSync(lockPath);
        return true;
    }
    catch {
        return false;
    }
}
export function getLockInfo(service) {
    const result = isLockValid(service);
    return result.valid ? result.info || null : null;
}
export function getAllLocks() {
    ensureLockDir();
    const locks = [];
    try {
        const { readdirSync } = await import('fs');
        const files = readdirSync(LOCK_DIR).filter(f => f.endsWith('.lock'));
        for (const file of files) {
            const service = file.replace('.lock', '');
            const result = isLockValid(service);
            if (result.valid && result.info) {
                locks.push({ service, info: result.info });
            }
        }
    }
    catch {
        // Directory might not exist or be readable
    }
    return locks;
}
export function releaseAllLocks() {
    const locks = getAllLocks();
    for (const { service } of locks) {
        releaseLock(service);
    }
}
export function getServiceNameFromOptions(options) {
    if (options.onlyApi)
        return 'dev:api';
    if (options.onlyWeb)
        return 'dev:web';
    if (options.onlyDocs)
        return 'dev:docs';
    if (options.withDocs)
        return 'dev:with-docs';
    return 'dev';
}
export function getPortsForService(serviceName) {
    const cfg = config.get();
    switch (serviceName) {
        case 'dev:api':
            return [cfg.ports.api];
        case 'dev:web':
            return [cfg.ports.web];
        case 'dev:docs':
            return [cfg.ports.docs];
        case 'dev:with-docs':
            return [cfg.ports.api, cfg.ports.web, cfg.ports.docs];
        case 'dev':
        default:
            return [cfg.ports.api, cfg.ports.web];
    }
}
//# sourceMappingURL=lockFile.js.map