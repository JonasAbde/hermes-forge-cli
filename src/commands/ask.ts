import { Command } from 'commander';
import { executeQuery } from '../lib/aiClient.js';
import { printHeader, printInfo, printError, printPanel } from '../lib/output.js';
import chalk from 'chalk';

const program = new Command('ask')
  .description('Ask questions about the Forge ecosystem')
  .argument('[query]', 'Natural language query (e.g., "show me packs", "what health?")')
  .option('--ai', 'Force AI mode (uses Hermes proxy for natural language)')
  .option('--list-queries', 'Show available query types')
  .action(async (query: string | undefined, opts: { ai?: boolean; listQueries?: boolean }) => {
    if (opts.listQueries || !query) {
      printHeader('Forge Ask');
      printInfo('Usage: forge ask <query> [--ai]');
      printInfo('');
      printInfo('Structured queries (no AI needed):');
      const result = await executeQuery('help', false);
      console.log(result.answer);
      return;
    }

    printHeader('Forge Ask');
    printInfo(`Query: "${query}"` + (opts.ai ? ' (AI mode)' : ''));

    const result = await executeQuery(query, opts.ai);

    if (result.source === 'error') {
      printError(result.answer);
      return;
    }

    console.log('');
    const sourceLabel = result.source === 'ai'
      ? chalk.hex('#8b5cf6')('[AI]')
      : chalk.hex('#6366f1')('[' + result.source.toUpperCase() + ']');
    printPanel(result.answer.split('\n'), { title: `Answer ${sourceLabel}` });
  });

export default program;
