import { Command } from 'commander';
import { execa } from 'execa';
import chalk from 'chalk';
import ora from 'ora';
import { printHeader, printSuccess, printError, printInfo, printWarning } from '../lib/output.js';
const PACKAGE_NAME = '@hermes-forge/cli';
const REGISTRY_URL = 'https://registry.npmjs.org/@hermes-forge/cli';
const CURRENT_VERSION = process.env.npm_package_version || '0.1.0';
async function getLatestVersion() {
    try {
        const response = await fetch(REGISTRY_URL);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        return data['dist-tags']?.latest || '0.0.0';
    }
    catch (error) {
        throw new Error(`Failed to check for updates: ${error.message}`);
    }
}
function compareVersions(current, latest) {
    const currentParts = current.split('.').map(Number);
    const latestParts = latest.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        if (latestParts[i] > currentParts[i])
            return true;
        if (latestParts[i] < currentParts[i])
            return false;
    }
    return false;
}
async function performUpgrade(version) {
    const targetVersion = version || 'latest';
    // Check if we're in a npm workspace (development mode)
    const cwd = process.cwd();
    const isWorkspace = cwd.includes('hermes-forge-platform/cli');
    if (isWorkspace) {
        // Development mode - rebuild from source
        printInfo('Development mode detected - rebuilding from source...');
        try {
            await execa('npm', ['run', 'build'], {
                cwd,
                timeout: 60000,
                stdio: 'inherit'
            });
        }
        catch (error) {
            throw new Error('Build failed - check output above');
        }
    }
    else {
        // Production mode - install from npm
        const installCmd = version
            ? ['install', '-g', `${PACKAGE_NAME}@${version}`]
            : ['install', '-g', PACKAGE_NAME];
        try {
            await execa('npm', installCmd, {
                timeout: 120000,
                stdio: 'inherit'
            });
        }
        catch (error) {
            throw new Error('npm install failed - you may need sudo/admin rights');
        }
    }
}
const program = new Command('upgrade')
    .description('Upgrade Forge CLI to latest version')
    .option('-c, --check', 'only check for updates, do not install')
    .option('-v, --version <version>', 'install specific version')
    .option('--force', 'force reinstall even if up to date')
    .action(async (options) => {
    printHeader('Forge CLI Upgrade');
    const spinner = ora('Checking for updates...').start();
    try {
        const latest = await getLatestVersion();
        const updateAvailable = compareVersions(CURRENT_VERSION, latest);
        spinner.stop();
        if (options.check) {
            // Just check, don't upgrade
            console.log(`  Current: ${chalk.gray(CURRENT_VERSION)}`);
            console.log(`  Latest:  ${chalk.cyan(latest)}`);
            console.log('');
            if (updateAvailable) {
                printSuccess('Update available!');
                printInfo('Run without --check to upgrade');
                process.exit(0);
            }
            else {
                printSuccess('You are on the latest version');
                process.exit(0);
            }
        }
        // Check if we need to upgrade
        if (!updateAvailable && !options.force && !options.version) {
            printSuccess(`Already on latest version: ${CURRENT_VERSION}`);
            printInfo('Use --force to reinstall');
            return;
        }
        if (options.version) {
            printInfo(`Installing specific version: ${chalk.cyan(options.version)}`);
        }
        else if (updateAvailable) {
            printSuccess(`Update available: ${chalk.gray(CURRENT_VERSION)} → ${chalk.cyan(latest)}`);
        }
        else {
            printWarning('Force reinstall requested');
        }
        console.log('');
        const upgradeSpinner = ora('Upgrading...').start();
        try {
            await performUpgrade(options.version);
            upgradeSpinner.succeed('Upgrade complete!');
            printSuccess(`Forge CLI has been updated to ${chalk.cyan(options.version || latest)}`);
            printInfo('\nRun "forge --version" to verify');
        }
        catch (error) {
            upgradeSpinner.fail('Upgrade failed');
            printError(error.message);
            printInfo('\nTroubleshooting:');
            printInfo('  - Check your internet connection');
            printInfo('  - Ensure you have npm installed');
            printInfo('  - Try with sudo/admin rights if permission denied');
            process.exit(1);
        }
    }
    catch (error) {
        spinner.fail('Failed to check for updates');
        printError(error.message);
        process.exit(1);
    }
});
export default program;
//# sourceMappingURL=upgrade.js.map