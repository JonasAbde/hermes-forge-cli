import { Command } from 'commander';
import startCommand from './start.js';
import stopCommand from './stop.js';
import statusCommand from './status.js';
import testCommand from './test.js';
import toolsCommand from './tools.js';
const program = new Command('mcp')
    .description('Manage MCP Registry server (start, stop, status, test, tools)')
    .addCommand(startCommand)
    .addCommand(stopCommand)
    .addCommand(statusCommand)
    .addCommand(testCommand)
    .addCommand(toolsCommand);
export default program;
//# sourceMappingURL=index.js.map