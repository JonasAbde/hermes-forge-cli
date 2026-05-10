import { Command } from 'commander';
import chalk from 'chalk';
import { checkMultipleHealth } from '../lib/healthCheck.js';
import { detectWsl } from '../lib/wslDetector.js';
import { config } from '../lib/configManager.js';
import { getAllLocks, isLockValid } from '../lib/lockManager.js';
import { printHeader } from '../lib/output.js';
function getTerminalSize() {
    const cols = process.stdout.columns || 80;
    const rows = process.stdout.rows || 24;
    return { cols, rows };
}
function formatDuration(ms) {
    if (ms < 1000)
        return `${ms}ms`;
    if (ms < 60000)
        return `${Math.floor(ms / 1000)}s`;
    if (ms < 3600000)
        return `${Math.floor(ms / 60000)}m`;
    return `${Math.floor(ms / 3600000)}h`;
}
function formatBytes(bytes) {
    if (bytes < 1024)
        return `${bytes}B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)}KB`;
    if (bytes < 1024 * 1024 * 1024)
        return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
}
function clearScreen() {
    process.stdout.write('\x1Bc\x1B[3J\x1B[H');
}
function getStateColor(state) {
    switch (state) {
        case 'up': return chalk.green;
        case 'down': return chalk.gray;
        case 'crashed': return chalk.red;
        case 'starting': return chalk.yellow;
        default: return chalk.white;
    }
}
function getStateIcon(state) {
    switch (state) {
        case 'up': return '●';
        case 'down': return '○';
        case 'crashed': return '✗';
        case 'starting': return '◐';
        default: return '?';
    }
}
async function fetchServiceStats(service) {
    if (service.pid && service.state === 'up') {
        try {
            const { execa } = await import('execa');
            const { stdout } = await execa('ps', ['-p', String(service.pid), '-o', '%cpu=,%mem=,rss=', '--no-headers'], {
                reject: false,
                timeout: 1000
            });
            if (stdout) {
                const parts = stdout.trim().split(/\s+/);
                if (parts.length >= 3) {
                    service.cpu = parseFloat(parts[0]) || undefined;
                    service.memory = parseInt(parts[2], 10) * 1024 || undefined;
                }
            }
        }
        catch {
            // Ignore errors
        }
    }
}
async function getAllServiceStatus() {
    const cfg = config.get();
    const services = [
        { key: 'web', name: 'Web (Vite)', port: cfg.ports.web, url: `http://127.0.0.1:${cfg.ports.web}`, state: 'down', restartCount: 0 },
        { key: 'api', name: 'API', port: cfg.ports.api, url: `http://127.0.0.1:${cfg.ports.api}/health`, state: 'down', restartCount: 0 },
        { key: 'docs', name: 'Docs (VitePress)', port: cfg.ports.docs, url: `http://127.0.0.1:${cfg.ports.docs}`, state: 'down', restartCount: 0 },
        { key: 'mcp', name: 'MCP Registry', port: cfg.ports.mcp, url: `http://127.0.0.1:${cfg.ports.mcp}/health`, state: 'down', restartCount: 0 }
    ];
    const allLocks = await getAllLocks();
    const lockMap = new Map(allLocks.map(l => [l.service, l]));
    const healthResults = await checkMultipleHealth(services.map(s => s.url));
    for (let i = 0; i < services.length; i++) {
        const service = services[i];
        const lock = lockMap.get(service.key);
        const health = healthResults[i];
        if (!lock) {
            service.state = 'down';
        }
        else {
            const isValid = await isLockValid(service.key);
            if (!isValid) {
                service.state = 'crashed';
                service.pid = lock.pid;
            }
            else {
                service.pid = lock.pid;
                service.restartCount = lock.restartCount || 0;
                const startTime = new Date(lock.startTime).getTime();
                service.uptime = Date.now() - startTime;
                if (health.status === 'up') {
                    service.state = 'up';
                    service.responseTime = health.responseTime;
                }
                else {
                    service.state = 'starting';
                }
            }
        }
        await fetchServiceStats(service);
    }
    return services;
}
let currentInterval = 2000;
function renderDashboard(services, refreshMs = currentInterval) {
    const { cols, rows } = getTerminalSize();
    // Safety: minimum terminal size check
    if (cols < 50 || rows < 10) {
        clearScreen();
        console.log(chalk.yellow('⚠ Terminal too small for monitor view'));
        console.log(chalk.gray(`  Need at least 50×10, have ${cols}×${rows}`));
        console.log(chalk.gray('  Resize or run: forge monitor --once'));
        console.log('');
        console.log(chalk.gray('  Press Ctrl+C to exit'));
        return;
    }
    clearScreen();
    const timestamp = new Date().toLocaleString();
    const titleWidth = Math.min(cols - 2, 60);
    const hr = '─'.repeat(titleWidth);
    console.log(chalk.bold.cyan(`\n  ⚡ Forge Monitor  ${chalk.gray(timestamp)}`));
    console.log(chalk.cyan(`  ${hr}\n`));
    // Empty state
    if (services.length === 0) {
        console.log(chalk.gray('  No services configured.'));
        console.log(chalk.gray('  Run forge init to set up your workspace.\n'));
        return;
    }
    // Service status section
    console.log(chalk.bold('  Services'));
    console.log('');
    for (const service of services) {
        const stateColor = getStateColor(service.state);
        const icon = getStateIcon(service.state);
        const statusLabel = stateColor(service.state.toUpperCase());
        // Service name + port
        const namePart = `    ${icon} ${chalk.bold(service.name.padEnd(20))}`;
        const portPart = chalk.gray(String(service.port).padStart(5));
        console.log(`${namePart}${portPart}  ${statusLabel}`);
        // Details line
        if (service.state === 'up' || service.state === 'starting') {
            const details = [];
            if (service.pid)
                details.push(`PID:${service.pid}`);
            if (service.uptime)
                details.push(`Uptime:${formatDuration(service.uptime)}`);
            if (service.responseTime)
                details.push(`${service.responseTime}ms`);
            if (service.cpu !== undefined)
                details.push(`CPU:${service.cpu.toFixed(1)}%`);
            if (service.memory)
                details.push(`MEM:${formatBytes(service.memory)}`);
            if (service.restartCount > 0)
                details.push(chalk.yellow(`⚠ ${service.restartCount} restarts`));
            if (details.length > 0) {
                console.log(`         ${chalk.gray(details.join(' | '))}`);
            }
        }
        else if (service.state === 'crashed') {
            console.log(`         ${chalk.red(`Stale PID: ${service.pid}`)}`);
        }
        console.log('');
    }
    // Summary
    const upCount = services.filter(s => s.state === 'up').length;
    const crashedCount = services.filter(s => s.state === 'crashed').length;
    const downCount = services.filter(s => s.state === 'down').length;
    console.log(chalk.cyan(`  ${hr}`));
    if (upCount === services.length) {
        console.log(chalk.green(`  ✓ All ${upCount} services healthy`));
    }
    else {
        console.log(`  ${chalk.green(`● ${upCount} up`)}  ${chalk.red(`✗ ${crashedCount} crashed`)}  ${chalk.gray(`○ ${downCount} down`)}`);
    }
    const wsl = detectWsl();
    if (wsl.isWsl2) {
        console.log(chalk.gray(`  WSL2 Host: ${wsl.hostIp || 'auto-detected'}`));
    }
    // Keyboard hints
    console.log('');
    console.log(chalk.gray('  q ' + chalk.dim('quit') + '  1-4 ' + chalk.dim('service detail') + '  r ' + chalk.dim('refresh now')));
    console.log(chalk.gray('  ' + chalk.dim(`Ctrl+C to exit  •  ${refreshMs}ms refresh`)));
    console.log('');
}
const program = new Command('monitor')
    .description('Real-time dashboard for monitoring all Forge services')
    .option('-i, --interval <ms>', 'refresh interval in milliseconds', '2000')
    .option('--once', 'run once and exit (no continuous monitoring)')
    .action(async (options) => {
    const interval = parseInt(options.interval, 10);
    if (options.once) {
        const services = await getAllServiceStatus();
        renderDashboard(services);
        return;
    }
    // Continuous monitoring mode
    printHeader('Forge Monitor');
    console.log(chalk.gray(`Refreshing every ${interval}ms...`));
    console.log('');
    currentInterval = interval;
    let running = true;
    // Handle Ctrl+C gracefully
    const handleExit = () => {
        if (running) {
            running = false;
            clearScreen();
            console.log(chalk.green('\n✓ Monitor stopped\n'));
            process.exit(0);
        }
    };
    process.on('SIGINT', handleExit);
    process.on('SIGTERM', handleExit);
    // Handle terminal resize
    const handleResize = () => {
        // Re-render on next tick to avoid rapid redraws during resize
        // Debounce is handled by the update loop — just set a flag
        resizePending = true;
    };
    let resizePending = false;
    process.stdout.on('resize', handleResize);
    // Initial render with loading state
    const { cols } = getTerminalSize();
    if (cols < 50) {
        console.log(chalk.yellow('⚠ Terminal too small — try a wider terminal window'));
    }
    // Set up keyboard input handling (raw mode)
    const stdin = process.stdin;
    if (stdin.isTTY) {
        stdin.setRawMode?.(true);
        stdin.resume();
        stdin.setEncoding('utf8');
        stdin.on('data', (key) => {
            // 'q' or 'Q' to quit
            if (key === 'q' || key === 'Q' || key === '\u0003') {
                handleExit();
            }
            // 'r' or 'R' to force refresh
            if (key === 'r' || key === 'R') {
                resizePending = true;
            }
        });
    }
    const services = await getAllServiceStatus();
    renderDashboard(services);
    // Update loop
    while (running) {
        await new Promise(resolve => setTimeout(resolve, interval));
        if (!running)
            break;
        // If no resize pending and not forced, skip this tick
        if (!resizePending)
            continue;
        resizePending = false;
        try {
            const updatedServices = await getAllServiceStatus();
            renderDashboard(updatedServices);
        }
        catch {
            // Ignore errors during refresh
        }
    }
    // Cleanup
    if (stdin.isTTY) {
        stdin.setRawMode?.(false);
        stdin.pause();
    }
    process.stdout.off('resize', handleResize);
});
export default program;
//# sourceMappingURL=monitor.js.map