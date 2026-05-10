import { Command } from 'commander';
import chalk from 'chalk';
import { execa } from 'execa';
import { readLogs, tailLogs, listLogFiles, clearLogs, getLogFilePath } from '../lib/logger.js';
import { getAllLocks } from '../lib/lockManager.js';
import { printHeader, printSuccess, printError, printWarning, printInfo } from '../lib/output.js';
import { detectEnvironment } from '../lib/envDetector.js';
// ── Systemd unit map ────────────────────────────────────────────
// Maps forge service names to their systemd unit names.
const SYSTEMD_UNIT_MAP = {
    'forge-api': 'forge-api.service',
    'forge-mcp': 'hermes-forge-mcp.service',
    'nginx': 'nginx.service',
    'forge-web': 'forge-web.service',
    'forge-forward': 'forge-forward-journal.service',
};
const FORGE_UNITS = Object.values(SYSTEMD_UNIT_MAP);
// ── Helpers ─────────────────────────────────────────────────────
/** Return the systemd unit name for a service, or null if unknown. */
function getSystemdUnit(service) {
    return SYSTEMD_UNIT_MAP[service] ?? null;
}
/** Return the short service name for a given systemd unit, or null. */
function serviceFromUnit(unit) {
    for (const [svc, u] of Object.entries(SYSTEMD_UNIT_MAP)) {
        if (u === unit)
            return svc;
    }
    return null;
}
/**
 * List all forge systemd units and their active status.
 * Returns an array of { service, unit, active } objects.
 */
async function listSystemdUnits(env) {
    if (!env.hasSystemd)
        return [];
    const results = [];
    for (const unit of FORGE_UNITS) {
        try {
            const { stdout } = await execa('systemctl', [
                'is-active',
                unit,
            ], { reject: false });
            const active = stdout.trim();
            const svc = serviceFromUnit(unit) ?? unit.replace('.service', '');
            results.push({ service: svc, unit, active });
        }
        catch {
            const svc = serviceFromUnit(unit) ?? unit.replace('.service', '');
            results.push({ service: svc, unit, active: 'unknown' });
        }
    }
    return results;
}
/**
 * List active forge systemd units (for auto-detection when no service is given).
 */
async function listRunningForgeUnits(env) {
    if (!env.hasSystemd)
        return [];
    const running = [];
    for (const unit of FORGE_UNITS) {
        try {
            const { stdout } = await execa('systemctl', [
                'is-active',
                unit,
            ], { reject: false });
            if (stdout.trim() === 'active') {
                const svc = serviceFromUnit(unit) ?? unit.replace('.service', '');
                running.push(svc);
            }
        }
        catch {
            // skip
        }
    }
    return running;
}
/**
 * Run journalctl for a systemd unit and return the output.
 */
async function journalctlLogs(unit, lines) {
    const { stdout } = await execa('journalctl', [
        '-u', unit,
        '-n', String(lines),
        '--no-pager',
        '--output=short-iso',
    ], { reject: false });
    return stdout;
}
/**
 * Follow journalctl output for a systemd unit.
 * Returns an abort function.
 */
function followJournalctl(unit, onLine) {
    const child = execa('journalctl', [
        '-u', unit,
        '-f',
        '--output=short-iso',
        '--no-tail',
    ], {
        buffer: false,
        reject: false,
    });
    let aborted = false;
    const onData = (chunk) => {
        if (aborted)
            return;
        const lines = chunk.split('\n').filter(Boolean);
        for (const line of lines) {
            onLine(line);
        }
    };
    child.stdout?.on('data', onData);
    child.stderr?.on('data', onData);
    return () => {
        aborted = true;
        child.catch(() => { });
        child.kill('SIGTERM');
        // Fallback kill after 2s
        setTimeout(() => {
            try {
                child.kill('SIGKILL');
            }
            catch { /* ignore */ }
        }, 2000);
    };
}
// ── Log entry formatting (same as before) ───────────────────────
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
// ── Program definition ──────────────────────────────────────────
const program = new Command('logs')
    .description('View and manage service logs')
    .argument('[service]', 'service name (auto-detected from running services if omitted)')
    .option('-f, --follow', 'follow log output in real-time')
    .option('-n, --lines <number>', 'number of lines to show', '50')
    .option('-l, --level <level>', 'filter by minimum level (debug, info, warn, error)')
    .option('--list', 'list all available log files and systemd units')
    .option('--clear', 'clear log files (requires confirmation)')
    .option('-u, --unit', 'show the systemd unit name being tailed (journald mode only)')
    .action(async (serviceArg, options) => {
    const env = await detectEnvironment();
    const isProd = env.environment === 'production' && env.hasJournald;
    // ── --list ────────────────────────────────────────────────
    if (options.list) {
        printHeader('Logs Overview');
        // Show systemd units (production)
        if (isProd) {
            const units = await listSystemdUnits(env);
            if (units.length > 0) {
                printInfo('Systemd Units:');
                for (const u of units) {
                    const activeColor = u.active === 'active' ? chalk.green :
                        u.active === 'inactive' ? chalk.red : chalk.gray;
                    console.log(`  ${chalk.cyan(u.service)} (${chalk.gray(u.unit)}) — ${activeColor(u.active)}`);
                }
                console.log();
            }
        }
        // Show file-based log files
        const logs = await listLogFiles();
        if (logs.length === 0 && !isProd) {
            printInfo('No log files found.');
            return;
        }
        if (logs.length > 0) {
            printInfo('File-based Logs:');
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
        }
        printInfo(`\nLog directory: ~/.forge/logs/`);
        return;
    }
    // ── --clear ───────────────────────────────────────────────
    if (options.clear) {
        printHeader('Clear Log Files');
        if (serviceArg) {
            printWarning(`This will clear file-based logs for service: ${serviceArg}`);
            printInfo('(journald logs cannot be cleared via this command)');
        }
        else {
            printWarning('This will clear ALL file-based log files.');
            printInfo('(journald logs cannot be cleared via this command)');
        }
        await clearLogs(serviceArg);
        printSuccess(serviceArg ? `Cleared file-based logs for ${serviceArg}` : 'Cleared all file-based log files');
        return;
    }
    // ── Determine service ─────────────────────────────────────
    let service = serviceArg;
    let useJournald = false;
    let systemdUnit = null;
    if (!service) {
        // Auto-detect — prefer systemd units in production, else locks
        if (isProd) {
            const running = await listRunningForgeUnits(env);
            if (running.length === 0) {
                printError('No service specified and no running forge systemd units detected.');
                printInfo('Specify a service: forge logs <service>');
                process.exit(1);
            }
            if (running.length === 1) {
                service = running[0];
                systemdUnit = getSystemdUnit(service);
                useJournald = true;
                printInfo(`Auto-detected service: ${service}`);
                if (options.unit && systemdUnit) {
                    printInfo(`Systemd unit: ${systemdUnit}`);
                }
            }
            else {
                printError('Multiple services running. Please specify one:');
                for (const svc of running) {
                    const unit = getSystemdUnit(svc);
                    printInfo(`  - ${svc}${unit ? ` (${unit})` : ''}`);
                }
                process.exit(1);
            }
        }
        else {
            // Dev mode — use lock files
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
    }
    else {
        // Service explicitly given — check if it maps to a systemd unit
        systemdUnit = getSystemdUnit(service);
        useJournald = isProd && systemdUnit !== null;
        if (useJournald && options.unit) {
            printInfo(`Systemd unit: ${systemdUnit}`);
        }
    }
    const lines = parseInt(options.lines, 10);
    const levelFilter = options.level?.toLowerCase();
    // ── Follow mode (journald) ─────────────────────────────────
    if (options.follow && useJournald && systemdUnit) {
        printHeader(`Following logs: ${service} [journald]`);
        printInfo('Press Ctrl+C to stop\n');
        // Print existing logs first
        const existing = await journalctlLogs(systemdUnit, lines);
        if (existing.trim()) {
            console.log(existing.trim());
        }
        // Then follow
        const unsubscribe = followJournalctl(systemdUnit, (line) => {
            console.log(line);
        });
        process.on('SIGINT', () => {
            unsubscribe();
            console.log('\n');
            process.exit(0);
        });
        await new Promise(() => { });
        return;
    }
    // ── Print mode (journald) ──────────────────────────────────
    if (!options.follow && useJournald && systemdUnit) {
        printHeader(`Logs: ${service} [journald]`);
        const output = await journalctlLogs(systemdUnit, lines);
        if (!output.trim()) {
            printInfo('No journald logs found for this unit.');
            return;
        }
        console.log(output.trim());
        printInfo(`\nShowing last ${lines} entries from journald unit ${systemdUnit}`);
        return;
    }
    // ── Fallback: file-based logs ──────────────────────────────
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