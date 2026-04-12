import { Command } from 'commander';
import chalk from 'chalk';
import { isMcpRunning, checkMcpHealth, listMcpTools, testMcpTool, getMcpDefaultPort } from '../../lib/mcpManager.js';
import { printHeader, printSuccess, printError, printWarning } from '../../lib/output.js';
import ora from 'ora';
const program = new Command('test')
    .description('Test MCP registry connectivity and tools')
    .option('-p, --port <number>', 'port to test', String(getMcpDefaultPort()))
    .option('--quick', 'quick check only (skip tool tests)')
    .action(async (options) => {
    printHeader('Testing MCP Registry');
    const port = parseInt(options.port, 10);
    const results = [];
    // Test 1: Check if running
    const spinner1 = ora('Checking if registry is running...').start();
    const running = await isMcpRunning(port);
    if (running) {
        spinner1.succeed('Registry is running');
        results.push({ name: 'Process Check', status: 'pass', message: 'Registry is active' });
    }
    else {
        spinner1.fail('Registry is not running');
        results.push({ name: 'Process Check', status: 'fail', message: 'Registry is not running' });
        printError('\nMCP registry is not running. Start it with: forge mcp start');
        process.exit(1);
    }
    // Test 2: Health check
    const spinner2 = ora('Health check...').start();
    const health = await checkMcpHealth(port);
    if (health.ok) {
        spinner2.succeed(`Health check passed (${health.responseTime}ms)`);
        results.push({ name: 'Health Check', status: 'pass', message: `OK (${health.responseTime}ms)` });
    }
    else {
        spinner2.fail(`Health check failed: ${health.error}`);
        results.push({ name: 'Health Check', status: 'fail', message: health.error || 'Failed' });
    }
    // Test 3: List tools (if not quick mode)
    if (!options.quick) {
        const spinner3 = ora('Listing available tools...').start();
        const tools = await listMcpTools(port);
        if (tools.length > 0) {
            spinner3.succeed(`Found ${tools.length} tool(s)`);
            results.push({ name: 'Tool Discovery', status: 'pass', message: `${tools.length} tools available` });
        }
        else {
            spinner3.warn('No tools found');
            results.push({ name: 'Tool Discovery', status: 'fail', message: 'No tools available' });
        }
        // Test 4: Test a specific tool if available
        if (tools.length > 0) {
            const testTool = tools[0];
            const spinner4 = ora(`Testing tool: ${testTool}...`).start();
            const testResult = await testMcpTool(testTool, {}, port);
            if (testResult.success) {
                spinner4.succeed(`Tool ${testTool} responded (${testResult.duration}ms)`);
                results.push({ name: `Tool: ${testTool}`, status: 'pass', message: `OK (${testResult.duration}ms)` });
            }
            else {
                spinner4.fail(`Tool ${testTool} failed: ${testResult.error}`);
                results.push({ name: `Tool: ${testTool}`, status: 'fail', message: testResult.error || 'Failed' });
            }
        }
    }
    // Summary
    console.log('\n' + chalk.bold('Test Summary:'));
    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    results.forEach(r => {
        const icon = r.status === 'pass' ? chalk.green('✓') : chalk.red('✗');
        console.log(`  ${icon} ${r.name}: ${r.message}`);
    });
    console.log('');
    if (failed === 0) {
        printSuccess(`All ${passed} test(s) passed!`);
    }
    else {
        printWarning(`${passed} passed, ${failed} failed`);
        process.exit(1);
    }
});
export default program;
//# sourceMappingURL=test.js.map