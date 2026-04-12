import { Command } from 'commander';
import { execa } from 'execa';
import { printHeader, printInfo, printWarning, printError, printSuccess } from '../lib/output.js';
import { config } from '../lib/configManager.js';
import { detectWsl } from '../lib/wslDetector.js';
import { isLockValid, acquireLock, releaseLock } from '../lib/lockManager.js';
import { createLogger } from '../lib/logger.js';
const program = new Command('dev')
    .description('Start Forge development services')
    .option('--with-docs', 'Start with Forge Docs (default for most workflows)')
    .option('--only-api', 'Start only the API')
    .option('--only-web', 'Start only the web app')
    .option('--only-docs', 'Start only Forge Docs')
    .option('--port-offset <number>', 'Add offset to all ports (for conflict resolution)', '0')
    .option('--force', 'Force start even if services are already running (releases existing locks)')
    .option('--log-to-file', 'Redirect output to log file in addition to console')
    .action(async (options) => {
    printHeader('Forge Dev');
    const cfg = config.get();
    const offset = parseInt(options.portOffset, 10);
    const wsl = detectWsl();
    if (wsl.isWsl2) {
        printWarning('WSL2 detected. Consider using --port-offset if you have conflicts with Windows services.');
    }
    let command = 'npm run dev';
    let description = 'Starting full development stack (API + Web)';
    let serviceName = 'dev';
    let mainPort = cfg.ports.web;
    if (options.withDocs || (!options.onlyApi && !options.onlyWeb && !options.onlyDocs)) {
        command = 'npm run dev:with-docs';
        description = 'Starting API + Web + Forge Docs';
        serviceName = 'dev-with-docs';
        mainPort = cfg.ports.web;
    }
    else if (options.onlyApi) {
        command = 'npm run dev:api';
        description = 'Starting only API (port ' + (cfg.ports.api + offset) + ')';
        serviceName = 'api';
        mainPort = cfg.ports.api;
    }
    else if (options.onlyWeb) {
        command = 'npm run dev:web';
        description = 'Starting only Web (port ' + (cfg.ports.web + offset) + ')';
        serviceName = 'web';
        mainPort = cfg.ports.web;
    }
    else if (options.onlyDocs) {
        command = 'npm run docs:dev';
        description = 'Starting only Forge Docs (port ' + (cfg.ports.docs + offset) + ')';
        serviceName = 'docs';
        mainPort = cfg.ports.docs;
    }
    // Check for existing lock
    const isRunning = await isLockValid(serviceName);
    if (isRunning) {
        if (options.force) {
            printWarning(`Releasing existing lock for ${serviceName}`);
            await releaseLock(serviceName);
        }
        else {
            printError(`Service "${serviceName}" is already running.`);
            printInfo(`Use 'forge status' to see all running services.`);
            printInfo(`Use --force to override and restart.`);
            process.exit(1);
        }
    }
    printInfo(description);
    if (offset > 0)
        printInfo(`Port offset applied: +${offset}`);
    let childProcess = null;
    let lockAcquired = false;
    // Set up signal handlers for graceful shutdown
    const cleanup = async (signal) => {
        if (lockAcquired) {
            printInfo(`\nReleasing lock for ${serviceName}...`);
            await releaseLock(serviceName);
            lockAcquired = false;
        }
        if (childProcess) {
            printInfo(`Stopping ${serviceName}...`);
            childProcess.kill(signal);
        }
    };
    process.on('SIGINT', () => cleanup('SIGINT'));
    process.on('SIGTERM', () => cleanup('SIGTERM'));
    let logger = null;
    try {
        // Create logger if --log-to-file is enabled
        if (options.logToFile) {
            logger = createLogger(serviceName);
            printInfo(`Logging to file enabled: ~/.forge/logs/${serviceName}.log`);
        }
        // Start the child process
        childProcess = execa(command, {
            cwd: process.cwd(),
            stdio: options.logToFile ? ['inherit', 'pipe', 'pipe'] : 'inherit',
            shell: true,
            env: {
                ...process.env,
                FORCE_COLOR: 'true'
            }
        });
        // Set up log piping if enabled
        if (options.logToFile && logger && childProcess.stdout && childProcess.stderr) {
            childProcess.stdout.on('data', (data) => {
                const lines = data.toString().split('\n').filter(Boolean);
                lines.forEach(line => {
                    logger?.info(line);
                    // Also output to console
                    console.log(line);
                });
            });
            childProcess.stderr.on('data', (data) => {
                const lines = data.toString().split('\n').filter(Boolean);
                lines.forEach(line => {
                    logger?.error(line);
                    // Also output to console
                    console.error(line);
                });
            });
        }
        // Wait a moment for process to start, then acquire lock
        await new Promise(resolve => setTimeout(resolve, 500));
        // Acquire lock with the child PID
        if (childProcess.pid) {
            await acquireLock(serviceName, childProcess.pid, mainPort + offset, command);
            lockAcquired = true;
            printSuccess(`Acquired lock for ${serviceName} (PID: ${childProcess.pid})`);
        }
        // Wait for the process to complete
        await childProcess;
        // Release lock on normal exit
        if (lockAcquired) {
            await releaseLock(serviceName);
            lockAcquired = false;
        }
        console.log('\n' + 'Development server stopped gracefully.');
    }
    catch (error) {
        // Release lock on error/exit
        if (lockAcquired) {
            await releaseLock(serviceName);
            lockAcquired = false;
        }
        if (error.signal === 'SIGINT') {
            console.log('\n' + 'Development server stopped gracefully.');
        }
        else {
            console.error('Failed to start services:', error.message);
            process.exit(1);
        }
    }
});
export default program;
//# sourceMappingURL=dev.js.map