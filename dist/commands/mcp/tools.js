import { Command } from 'commander';
import chalk from 'chalk';
import { listMcpTools, testMcpTool, getMcpBaseUrl, getMcpDefaultPort, isMcpRunning } from '../../lib/mcpManager.js';
import { printHeader, printError, printInfo, printWarning } from '../../lib/output.js';
import ora from 'ora';
const program = new Command('tools')
    .description('List and call MCP tools')
    .addCommand(new Command('list')
    .description('List all available MCP tools')
    .option('-p, --port <number>', 'MCP registry port', String(getMcpDefaultPort()))
    .option('--json', 'output as JSON')
    .action(async (options) => {
    const port = parseInt(options.port, 10);
    if (options.json) {
        const toolsResult = await listMcpTools(port);
        console.log(JSON.stringify({ tools: toolsResult.tools, error: toolsResult.error || null, port }, null, 2));
        return;
    }
    printHeader('MCP Tools');
    const running = await isMcpRunning(port);
    if (!running) {
        printError('MCP registry is not running');
        printInfo('Start with: forge mcp start');
        process.exit(1);
    }
    const spinner = ora('Fetching tools...').start();
    try {
        const toolsResult = await listMcpTools(port);
        const tools = toolsResult.tools;
        spinner.stop();
        if (tools.length === 0) {
            if (toolsResult.error) {
                printWarning(`No tools available: ${toolsResult.error}`);
            }
            else {
                printWarning('No tools available');
            }
            return;
        }
        console.log(chalk.bold(`\nAvailable Tools (${tools.length}):\n`));
        tools.forEach((tool, i) => {
            const num = chalk.gray(`${(i + 1).toString().padStart(2)}.`);
            console.log(`${num} ${chalk.cyan(tool)}`);
        });
        console.log('');
        printInfo(`Use 'forge mcp tools call <tool-name>' to call a tool`);
    }
    catch (error) {
        spinner.fail('Failed to fetch tools');
        printError(error.message);
        process.exit(1);
    }
}))
    .addCommand(new Command('call')
    .description('Call an MCP tool with parameters')
    .argument('<tool-name>', 'name of the tool to call')
    .option('-p, --port <number>', 'MCP registry port', String(getMcpDefaultPort()))
    .option('-d, --data <json>', 'JSON parameters to send', '{}')
    .option('-f, --file <path>', 'read parameters from JSON file')
    .option('--json', 'output raw JSON response')
    .action(async (toolName, options) => {
    const port = parseInt(options.port, 10);
    // Parse parameters
    let params = {};
    if (options.file) {
        try {
            const { readFile } = await import('fs/promises');
            const content = await readFile(options.file, 'utf8');
            params = JSON.parse(content);
        }
        catch (error) {
            printError(`Failed to read parameter file: ${error.message}`);
            process.exit(1);
        }
    }
    else if (options.data) {
        try {
            params = JSON.parse(options.data);
        }
        catch {
            printError('Invalid JSON in --data parameter');
            process.exit(1);
        }
    }
    if (options.json) {
        const result = await testMcpTool(toolName, params, port);
        console.log(JSON.stringify(result, null, 2));
        return;
    }
    printHeader(`Call MCP Tool: ${toolName}`);
    const running = await isMcpRunning(port);
    if (!running) {
        printError('MCP registry is not running');
        printInfo('Start with: forge mcp start');
        process.exit(1);
    }
    // Show parameters being sent
    if (Object.keys(params).length > 0) {
        console.log(chalk.gray('Parameters:'));
        console.log(chalk.gray(JSON.stringify(params, null, 2)));
        console.log('');
    }
    const spinner = ora(`Calling ${toolName}...`).start();
    try {
        const result = await testMcpTool(toolName, params, port);
        if (result.success) {
            spinner.succeed(`${toolName} responded (${result.duration}ms)`);
            console.log('');
            console.log(chalk.bold('Response:'));
            console.log(chalk.cyan(JSON.stringify(result.result, null, 2)));
        }
        else {
            spinner.fail(`${toolName} failed`);
            printError(result.error || 'Unknown error');
            process.exit(1);
        }
    }
    catch (error) {
        spinner.fail('Call failed');
        printError(error.message);
        process.exit(1);
    }
}))
    .addCommand(new Command('info')
    .description('Get detailed info about a specific tool')
    .argument('<tool-name>', 'name of the tool')
    .option('-p, --port <number>', 'MCP registry port', String(getMcpDefaultPort()))
    .action(async (toolName, options) => {
    const port = parseInt(options.port, 10);
    const url = getMcpBaseUrl(port);
    printHeader(`Tool Info: ${toolName}`);
    try {
        // Fetch tool schema/info from registry
        const response = await fetch(`${url}/tools/${toolName}/schema`);
        if (!response.ok) {
            if (response.status === 404) {
                printError(`Tool not found: ${toolName}`);
                // Suggest similar tools
                const toolsResult = await listMcpTools(port);
                const tools = toolsResult.tools;
                const similar = tools.filter(t => t.includes(toolName) || toolName.includes(t));
                if (similar.length > 0) {
                    console.log('');
                    printInfo('Did you mean:');
                    similar.forEach(t => console.log(`  • ${t}`));
                }
                process.exit(1);
            }
            throw new Error(`HTTP ${response.status}`);
        }
        const schema = await response.json();
        console.log(chalk.bold('\nSchema:'));
        console.log(chalk.cyan(JSON.stringify(schema, null, 2)));
    }
    catch (error) {
        printError(`Failed to get tool info: ${error.message}`);
        process.exit(1);
    }
}));
export default program;
//# sourceMappingURL=tools.js.map