import { execSync } from 'child_process';
export async function checkPort(port) {
    try {
        // Try to find process using the port
        let pid;
        let command;
        try {
            const output = execSync(`ss -ltnp | grep ':${port} ' || true`, { encoding: 'utf8' }).trim();
            if (output) {
                const pidMatch = output.match(/pid=(\d+)/);
                if (pidMatch) {
                    pid = parseInt(pidMatch[1], 10);
                }
                const cmdMatch = output.match(/users:\(\("([^"]+)"|\(([^)]+)\)\)/);
                if (cmdMatch) {
                    command = cmdMatch[1] || cmdMatch[2];
                }
            }
        }
        catch {
            // ss command failed, fallback
        }
        return {
            port,
            isInUse: !!pid,
            pid,
            command
        };
    }
    catch (error) {
        return {
            port,
            isInUse: false
        };
    }
}
export async function checkPorts(ports) {
    const checks = await Promise.all(ports.map(checkPort));
    return checks;
}
//# sourceMappingURL=portChecker.js.map