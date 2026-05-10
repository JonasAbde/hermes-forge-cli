import { Command } from 'commander';
import chalk from 'chalk';
import { getMcpStatus, getMcpDefaultPort } from '../../lib/mcpManager.js';
import { printHeader, printSuccess, printError, printInfo, printWarning } from '../../lib/output.js';

const program = new Command('status')
  .description('Show MCP registry status')
  .option('-p, --port <number>', 'port to check', String(getMcpDefaultPort()))
  .option('--json', 'output as JSON')
  .action(async (options) => {
    const port = parseInt(options.port, 10);
    
    const status = await getMcpStatus(port);
    
    if (options.json) {
      console.log(JSON.stringify(status, null, 2));
      return;
    }
    
    printHeader('MCP Registry Status');
    
    if (!status || !status.running) {
      printError('MCP registry is not running');
      printInfo('Start with: forge mcp start');
      return;
    }
    
    printSuccess(`Status: ${chalk.green('RUNNING')}`);
    
    const { default: Table } = await import('cli-table3');
    const table = new Table({
      style: { head: ['cyan'] }
    });
    
    table.push(['PID', status.pid || 'unknown']);
    table.push(['Port', status.port]);
    table.push(['URL', status.url]);
    
    if (status.uptime) {
      const uptimeSeconds = Math.floor(status.uptime / 1000);
      const uptimeStr = uptimeSeconds < 60 
        ? `${uptimeSeconds}s` 
        : uptimeSeconds < 3600 
          ? `${Math.floor(uptimeSeconds / 60)}m ${uptimeSeconds % 60}s`
          : `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m`;
      table.push(['Uptime', uptimeStr]);
    }
    
    table.push(['Tools', status.tools.length.toString()]);
    
    console.log(table.toString());
    
    if (status.toolsError) {
      printWarning(`\\nTool discovery: ${status.toolsError}`);
    }
    
    if (status.tools.length > 0) {
      console.log('\\n' + chalk.bold('Available Tools:'));
      status.tools.forEach(tool => {
        console.log(`  ${chalk.cyan('•')} ${tool}`);
      });
    } else if (!status.toolsError) {
      printWarning('\\nNo tools available on the MCP server');
    }
  });

export default program;
