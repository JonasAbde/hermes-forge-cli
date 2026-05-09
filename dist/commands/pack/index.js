import { Command } from 'commander';
import listCommand from './list.js';
import validateCommand from './validate.js';
import buildCommand from './build.js';
import metadataCommand from './metadata.js';
import syncCommand from './sync.js';
const program = new Command('pack')
    .description('Manage Agent Packs (list, validate, build, metadata, sync)')
    .addCommand(listCommand).addCommand(validateCommand).addCommand(buildCommand).addCommand(metadataCommand).addCommand(syncCommand);
export default program;
//# sourceMappingURL=index.js.map