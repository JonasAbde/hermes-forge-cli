import { Command } from 'commander';
import chalk from 'chalk';
import { 
  startMcpRegistry, 
  isMcpRunning, 
  getMcpDefaultPort,
  isMcpRegistryInstalled 
} from '../../lib/mcpManager.js';
import { printHeader, printSuccess, printError, printWarning, printInfo } from '../../lib/output.js';
import ora from 'ora';

const program = new Command('start')
  .description('Start the MCP registry server')
  .option('-p, --port <number>', 'port to run on', String(getMcpDefaultPort()))
  .option('-d, --detach', 'run in background (detached mode)')
  .option('-f, --force', 'force restart if already running')
  .action(async (options) => {
    printHeader('Starting MCP Registry');
    
    // Check if registry is installed
    const installed = await isMcpRegistryInstalled();
    if (!installed) {
      printError('MCP registry not found.');
      printInfo(`Expected at: integrations/mcp-forge-registry/`);
      printInfo('Install with: cd integrations/mcp-forge-registry && uv sync');
      process.exit(1);
    }
    
    const port = parseInt(options.port, 10);
    
    // Check if already running
    const running = await isMcpRunning(port);
    if (running) {
      if (options.force) {
        printWarning('MCP registry already running, restarting...');
        const { stopMcpRegistry } = await import('../../lib/mcpManager.js');
        await stopMcpRegistry();
      } else {
        printError(`MCP registry already running on port ${port}`);
        printInfo('Use --force to restart');
        process.exit(1);
      }
    }
    
    const spinner = ora('Starting MCP registry...').start();
    
    try {
      const result = await startMcpRegistry(port);
      spinner.succeed(`MCP registry started`);
      
      printSuccess(`PID: ${result.pid}`);
      printSuccess(`Port: ${result.port}`);
      printSuccess(`URL: ${result.url}`);
      
      if (options.detach) {
        printInfo('\nRunning in detached mode. Use `forge mcp stop` to stop.');
        process.exit(0);
      }
      
      printInfo('\nPress Ctrl+C to stop');
      
      // Keep running until interrupted
      await new Promise((_, reject) => {
        process.on('SIGINT', () => {
          spinner.stop();
          reject(new Error('SIGINT'));
        });
      });
    } catch (error: any) {
      spinner.fail('Failed to start MCP registry');
      printError(error.message);
      process.exit(1);
    }
  });

export default program;
