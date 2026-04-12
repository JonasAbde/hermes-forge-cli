import { Command } from 'commander';
import listCommand from './list.js';
import validateCommand from './validate.js';
import buildCommand from './build.js';
const program = new Command('pack')
    .description('Manage Agent Packs (list, validate, build, metadata)')
    .addCommand(listCommand)
    .addCommand(validateCommand)
    .addCommand(buildCommand)
    // metadata command will be added in next iteration
    .addCommand(new Command('metadata').description('Generate compact metadata for MCP (placeholder)'));
export default program;
//# sourceMappingURL=index.js.map