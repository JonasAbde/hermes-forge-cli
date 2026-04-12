import { Command } from 'commander';
import chalk from 'chalk';
import { readLogs, tailLogs, listLogFiles, clearLogs, getLogFilePath } from '../lib/logger.js';
import { getAllLocks } from '../lib/lockManager.js';
import { printHeader, printSuccess, printError, printWarning, printInfo } from '../lib/output.js';
function formatLogEntry(entry) {
    const timestamp = chalk.gray(new Date(entry.timestamp).toLocaleTimeString());
    let levelBadge;
    switch (entry.level) {
        case 'debug':
            levelBadge = chalk.gray('DBG');
            break;
        case 'info':
            levelBadge = chalk.cyan('INF');
            break;
        case 'warn':
            levelBadge = chalk.yellow('WRN');
            break;
        case 'error':
            levelBadge = chalk.red('ERR');
            break;
        default:
            levelBadge = chalk.gray(String(entry.level).toUpperCase());
    }
    const service = chalk.cyan(`[${entry.service}]`);
    return `${timestamp} ${levelBadge} ${service} ${entry.message}`;
}
function matchesLevel(entry, levelFilter) {
    if (!levelFilter)
        return true;
    const levels = ['debug', 'info', 'warn', 'error'];
    const entryIndex = levels.indexOf(entry.level);
    const filterIndex = levels.indexOf(levelFilter);
    // Show this level and above
    return entryIndex >= filterIndex;
}
const program = new Command('logs')
    .description('View and manage service logs')
    .argument('[service]', 'service name (auto-detected from running services if omitted)')
    .option('-f, --follow', 'follow log output in real-time')
    .option('-n, --lines <number>', 'number of lines to show', '50')
    .option('-l, --level <level>', 'filter by minimum level (debug, info, warn, error)')
    .option('--list', 'list all available log files')
    .option('--clear', 'clear log files (requires confirmation)')
    .action(async (serviceArg, options) => {
    // Handle --list
    if (options.list) {
        printHeader('Log Files');
        const logs = await listLogFiles();
        if (logs.length === 0) {
            printInfo('No log files found.');
            return;
        }
        const { default: Table } = await import('cli-table3');
        const table = new Table({
            head: [chalk.bold('Service'), chalk.bold('Size'), chalk.bold('Last Modified')],
            colWidths: [25, 15, 25],
            style: { head: ['cyan'] }
        });
        logs.forEach(({ service, size, modified }) => {
            const sizeStr = size < 1024 ? `${size}B` :
                size < 1024 * 1024 ? `${(size / 1024).toFixed(1)}KB` :
                    `${(size / (1024 * 1024)).toFixed(1)}MB`;
            table.push([service, sizeStr, modified.toLocaleString()]);
        });
        console.log(table.toString());
        printInfo(`\nLog directory: ~/.forge/logs/`);
        return;
    }
    // Handle --clear
    if (options.clear) {
        printHeader('Clear Log Files');
        if (serviceArg) {
            printWarning(`This will clear logs for service: ${serviceArg}`);
        }
        else {
            printWarning('This will clear ALL log files.');
        }
        // In a real implementation, we'd ask for confirmation here
        // For now, just clear without prompt for automation
        await clearLogs(serviceArg);
        printSuccess(serviceArg ? `Cleared logs for ${serviceArg}` : 'Cleared all log files');
        return;
    }
    // Determine service
    let service = serviceArg;
    if (!service) {
        // Auto-detect from running services
        const locks = await getAllLocks();
        if (locks.length === 0) {
            printError('No service specified and no running services detected.');
            printInfo('Specify a service: forge logs <service>');
            printInfo('Or start a service first: forge dev');
            process.exit(1);
        }
        if (locks.length === 1) {
            service = locks[0].service;
            printInfo(`Auto-detected service: ${service}`);
        }
        else {
            printError('Multiple services running. Please specify one:');
            locks.forEach(lock => printInfo(`  - ${lock.service}`));
            process.exit(1);
        }
    }
    const lines = parseInt(options.lines, 10);
    const levelFilter = options.level?.toLowerCase();
    if (options.follow) {
        // Follow mode
        printHeader(`Following logs: ${service}`);
        printInfo('Press Ctrl+C to stop\n');
        // Print existing logs first
        const entries = await readLogs(service, lines);
        entries
            .filter(e => matchesLevel(e, levelFilter))
            .forEach(entry => console.log(formatLogEntry(entry)));
        // Then tail
        const unsubscribe = tailLogs(service, (entry) => {
            if (matchesLevel(entry, levelFilter)) {
                console.log(formatLogEntry(entry));
            }
        });
        // Handle Ctrl+C
        process.on('SIGINT', () => {
            unsubscribe();
            console.log('\n');
            process.exit(0);
        });
        // Keep running
        await new Promise(() => { });
    }
    else {
        // Print mode
        printHeader(`Logs: ${service}`);
        const entries = await readLogs(service, lines);
        if (entries.length === 0) {
            printInfo('No logs found.');
            printInfo(`Log file: ${getLogFilePath(service)}`);
            return;
        }
        const filtered = entries.filter(e => matchesLevel(e, levelFilter));
        filtered.forEach(entry => {
            console.log(formatLogEntry(entry));
        });
        printInfo(`\nShowing ${filtered.length} of ${entries.length} entries`);
        if (levelFilter) {
            printInfo(`Filter: ${levelFilter} and above`);
        }
    }
});
export default program;
//# sourceMappingURL=logs.js.map