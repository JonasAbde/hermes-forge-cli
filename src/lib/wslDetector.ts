import { readFileSync } from 'fs';

export interface WslInfo {
  isWsl: boolean;
  isWsl2: boolean;
  hostIp: string | null;
  openCommand: (url: string) => string[];
}

export function detectWsl(): WslInfo {
  try {
    const procVersion = readFileSync('/proc/version', 'utf8').toLowerCase();
    const isWsl = procVersion.includes('microsoft') || procVersion.includes('wsl');
    const isWsl2 = isWsl && procVersion.includes('wsl2');

    let hostIp: string | null = null;
    if (isWsl) {
      try {
        const resolv = readFileSync('/etc/resolv.conf', 'utf8');
        const match = resolv.match(/^nameserver\s+(\S+)/m);
        hostIp = match?.[1] ?? null;
      } catch {
        // Fallback if resolv.conf not readable
      }
    }

    return {
      isWsl,
      isWsl2,
      hostIp,
      openCommand: (url: string) => isWsl
        ? ['cmd.exe', '/c', 'start', url]
        : ['open', url]
    };
  } catch {
    return { 
      isWsl: false, 
      isWsl2: false, 
      hostIp: null, 
      openCommand: (url: string) => ['open', url] 
    };
  }
}
