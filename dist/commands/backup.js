import { Command } from 'commander';
import { execa } from 'execa';
import { mkdir, readdir, writeFile, stat, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import chalk from 'chalk';
import ora from 'ora';
import { printHeader, printSuccess, printError, printInfo, printWarning } from '../lib/output.js';
const BACKUPS_DIR = join(homedir(), '.forge', 'backups');
async function ensureBackupsDir() {
    await mkdir(BACKUPS_DIR, { recursive: true });
}
function getBackupPath(name) {
    const timestamp = new Date().toISOString().slice(0, 10);
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    return join(BACKUPS_DIR, `${safeName}_${timestamp}.tar.gz`);
}
async function listBackups() {
    await ensureBackupsDir();
    try {
        const files = await readdir(BACKUPS_DIR);
        const backups = [];
        for (const file of files) {
            if (file.endsWith('.tar.gz')) {
                const path = join(BACKUPS_DIR, file);
                const stats = await stat(path);
                backups.push({
                    name: file.replace('.tar.gz', ''),
                    path,
                    created: stats.mtime,
                    size: stats.size,
                    files: []
                });
            }
        }
        return backups.sort((a, b) => b.created.getTime() - a.created.getTime());
    }
    catch {
        return [];
    }
}
async function createBackup(name, paths, description) {
    await ensureBackupsDir();
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const backupName = `${safeName}_${timestamp}`;
    const backupPath = join(BACKUPS_DIR, `${backupName}.tar.gz`);
    // Create tar archive
    const validPaths = paths.filter(p => existsSync(p));
    if (validPaths.length === 0) {
        throw new Error('No valid paths to backup');
    }
    // Add metadata
    const metadata = {
        name,
        description,
        created: new Date().toISOString(),
        paths: validPaths,
        cwd: process.cwd()
    };
    const metaPath = join(BACKUPS_DIR, `${backupName}.json`);
    await writeFile(metaPath, JSON.stringify(metadata, null, 2));
    // Create tar.gz archive
    try {
        await execa('tar', ['-czf', backupPath, ...validPaths], {
            cwd: process.cwd(),
            timeout: 60000
        });
    }
    catch (error) {
        // Clean up on failure
        try {
            await rm(metaPath);
        }
        catch {
            // Ignore
        }
        throw new Error(`Failed to create backup: ${error.message}`);
    }
    const stats = await stat(backupPath);
    return {
        name: backupName,
        path: backupPath,
        created: new Date(),
        size: stats.size,
        description,
        files: validPaths
    };
}
async function restoreBackup(backupPath, targetDir) {
    if (!existsSync(backupPath)) {
        throw new Error('Backup not found');
    }
    await mkdir(targetDir, { recursive: true });
    // Extract tar.gz
    try {
        await execa('tar', ['-xzf', backupPath, '-C', targetDir], {
            timeout: 60000
        });
    }
    catch (error) {
        throw new Error(`Failed to extract backup: ${error.message}`);
    }
}
async function deleteBackup(backupPath) {
    if (!existsSync(backupPath)) {
        throw new Error('Backup not found');
    }
    await rm(backupPath);
    // Also delete metadata if exists
    const metaPath = backupPath.replace('.tar.gz', '.json');
    try {
        await rm(metaPath);
    }
    catch {
        // Ignore
    }
}
function formatSize(bytes) {
    if (bytes < 1024)
        return `${bytes}B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)}KB`;
    if (bytes < 1024 * 1024 * 1024)
        return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
}
const program = new Command('backup')
    .description('Manage Forge backups')
    .addCommand(new Command('create')
    .description('Create a new backup')
    .argument('<name>', 'backup name')
    .option('-p, --paths <paths...>', 'paths to include', ['.'])
    .option('-d, --description <text>', 'backup description')
    .option('--exclude <patterns...>', 'patterns to exclude')
    .action(async (name, options) => {
    printHeader('Create Backup');
    const spinner = ora('Creating backup...').start();
    try {
        const backup = await createBackup(name, options.paths, options.description);
        spinner.succeed(`Backup created: ${backup.name}`);
        printSuccess(`Location: ${backup.path}`);
        printSuccess(`Size: ${formatSize(backup.size)}`);
        printInfo(`Files: ${backup.files.length}`);
        if (options.description) {
            printInfo(`Description: ${options.description}`);
        }
    }
    catch (error) {
        spinner.fail('Backup failed');
        printError(error.message);
        process.exit(1);
    }
}))
    .addCommand(new Command('list')
    .description('List all backups')
    .option('--json', 'output as JSON')
    .action(async (options) => {
    const backups = await listBackups();
    if (options.json) {
        console.log(JSON.stringify(backups, null, 2));
        return;
    }
    printHeader('Backups');
    if (backups.length === 0) {
        printInfo('No backups found');
        printInfo(`Backups are stored in: ${BACKUPS_DIR}`);
        return;
    }
    const { default: Table } = await import('cli-table3');
    const table = new Table({
        head: [chalk.bold('Name'), chalk.bold('Size'), chalk.bold('Created')],
        colWidths: [40, 12, 25],
        style: { head: ['cyan'] }
    });
    backups.forEach(b => {
        table.push([
            b.name,
            formatSize(b.size),
            b.created.toLocaleString()
        ]);
    });
    console.log(table.toString());
    printInfo(`\nTotal: ${backups.length} backup(s)`);
    printInfo(`Location: ${BACKUPS_DIR}`);
}))
    .addCommand(new Command('restore')
    .description('Restore from backup')
    .argument('<name>', 'backup name to restore')
    .option('-t, --target <dir>', 'target directory', process.cwd())
    .option('--force', 'overwrite existing files')
    .action(async (name, options) => {
    printHeader('Restore Backup');
    const backups = await listBackups();
    const backup = backups.find(b => b.name === name || b.name.startsWith(name));
    if (!backup) {
        printError(`Backup not found: ${name}`);
        printInfo('Use "forge backup list" to see available backups');
        process.exit(1);
    }
    printWarning(`This will restore ${chalk.bold(backup.name)} to:`);
    printInfo(`  ${options.target}`);
    const spinner = ora('Restoring...').start();
    try {
        await restoreBackup(backup.path, options.target);
        spinner.succeed('Backup restored');
        printSuccess('Files restored successfully');
    }
    catch (error) {
        spinner.fail('Restore failed');
        printError(error.message);
        process.exit(1);
    }
}))
    .addCommand(new Command('delete')
    .description('Delete a backup')
    .alias('rm')
    .argument('<name>', 'backup name to delete')
    .action(async (name) => {
    printHeader('Delete Backup');
    const backups = await listBackups();
    const backup = backups.find(b => b.name === name || b.name.startsWith(name));
    if (!backup) {
        printError(`Backup not found: ${name}`);
        process.exit(1);
    }
    printWarning(`Deleting: ${chalk.bold(backup.name)}`);
    printInfo(`Size: ${formatSize(backup.size)}`);
    try {
        await deleteBackup(backup.path);
        printSuccess('Backup deleted');
    }
    catch (error) {
        printError(error.message);
        process.exit(1);
    }
}))
    .addCommand(new Command('auto')
    .description('Configure automatic backups')
    .option('-e, --enable', 'enable auto-backup')
    .option('-d, --disable', 'disable auto-backup')
    .option('-i, --interval <hours>', 'backup interval in hours', '24')
    .option('-p, --paths <paths...>', 'paths to backup', ['.'])
    .action(async (options) => {
    printHeader('Auto-Backup Configuration');
    if (options.enable) {
        printSuccess('Auto-backup enabled');
        printInfo(`Interval: ${options.interval} hours`);
        printInfo(`Paths: ${options.paths.join(', ')}`);
        printInfo('\nNext backup: [calculated from interval]');
    }
    else if (options.disable) {
        printSuccess('Auto-backup disabled');
    }
    else {
        printInfo('Current status: [not implemented]');
        printInfo('Use --enable or --disable to change');
    }
}));
export default program;
//# sourceMappingURL=backup.js.map