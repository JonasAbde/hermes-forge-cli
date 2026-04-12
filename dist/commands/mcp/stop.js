import { Command } from 'commander';
import { stopMcpRegistry, isMcpRunning } from '../../lib/mcpManager.js';
import { printHeader, printSuccess, printError, printWarning, printInfo } from '../../lib/output.js';
import ora from 'ora';
const program = new Command('stop')
    .description('Stop the MCP registry server')
    .action(async () => {
    printHeader('Stopping MCP Registry');
    // Check if running
    const running = await isMcpRunning();
    if (!running) {
        printWarning('MCP registry is not running');
        return;
    }
    const spinner = ora('Stopping MCP registry...').start();
    try {
        const stopped = await stopMcpRegistry();
        if (stopped) {
            spinner.succeed('MCP registry stopped');
            printSuccess('Process terminated successfully');
        }
        else {
            spinner.warn('No lock file found');
            printInfo('Registry may have already stopped');
        }
    }
    catch (error) {
        spinner.fail('Failed to stop MCP registry');
        printError(error.message);
        process.exit(1);
    }
});
export default program;
//# sourceMappingURL=stop.js.map