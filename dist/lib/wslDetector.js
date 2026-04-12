import { readFileSync } from 'fs';
export function detectWsl() {
    try {
        const procVersion = readFileSync('/proc/version', 'utf8').toLowerCase();
        const isWsl = procVersion.includes('microsoft') || procVersion.includes('wsl');
        const isWsl2 = isWsl && procVersion.includes('wsl2');
        let hostIp = null;
        if (isWsl) {
            try {
                const resolv = readFileSync('/etc/resolv.conf', 'utf8');
                const match = resolv.match(/^nameserver\s+(\S+)/m);
                hostIp = match?.[1] ?? null;
            }
            catch {
                // Fallback if resolv.conf not readable
            }
        }
        return {
            isWsl,
            isWsl2,
            hostIp,
            openCommand: (url) => isWsl
                ? ['cmd.exe', '/c', 'start', url]
                : ['open', url]
        };
    }
    catch {
        return {
            isWsl: false,
            isWsl2: false,
            hostIp: null,
            openCommand: (url) => ['open', url]
        };
    }
}
//# sourceMappingURL=wslDetector.js.map