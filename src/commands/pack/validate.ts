import { Command } from 'commander';
import { z } from 'zod';
import { readFileSync, existsSync } from 'fs';
import { printHeader, printSuccess, printError, printWarning } from '../../lib/output.js';

const PackSchema = z.object({
  pack_id: z.string(),
  name: z.string(),
  status: z.enum(['draft', 'review', 'published']),
  visibility: z.enum(['public', 'private']).optional(),
  card_theme: z.string().optional(),
  // Add more fields as needed from forge.ts types
});

const program = new Command('validate')
  .description('Validate packs against schema')
  .argument('[pack-id]', 'Specific pack to validate, or "all"')
  .option('--strict', 'Fail on warnings')
  .action(async (packId = 'all', options) => {
    printHeader('Pack Validation');

    const catalogPath = 'server/data/catalog.json';
    if (!existsSync(catalogPath)) {
      printError('catalog.json not found');
      process.exit(1);
    }

    try {
      const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
      const packs = catalog.packs || [];

      if (packId === 'all' || !packId) {
        console.log(`Validating ${packs.length} packs...`);
        let errors = 0;

        for (const pack of packs) {
          try {
            PackSchema.parse(pack);
            printSuccess(`✓ ${pack.pack_id} - ${pack.name}`);
          } catch (e: any) {
            printError(`✗ ${pack.pack_id} - ${e.errors?.[0]?.message || e.message}`);
            errors++;
          }
        }

        if (errors > 0) {
          printError(`\n${errors} validation error(s) found.`);
          if (options.strict) process.exit(1);
        } else {
          printSuccess('\nAll packs passed validation.');
        }
      } else {
        const pack = packs.find((p: any) => p.pack_id === packId);
        if (!pack) {
          printError(`Pack ${packId} not found`);
          process.exit(1);
        }
        PackSchema.parse(pack);
        printSuccess(`Pack ${packId} is valid.`);
      }
    } catch (error: any) {
      printError(`Failed to read catalog: ${error.message}`);
      process.exit(1);
    }
  });

export default program;
