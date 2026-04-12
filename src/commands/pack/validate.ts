import { Command } from 'commander';
import { z } from 'zod';
import { readFileSync, existsSync } from 'fs';
import { printHeader, printSuccess, printError, printWarning, printInfo } from '../../lib/output.js';
import { resolveRepoRoot, catalogJsonPathForRoot } from '../../lib/repoPaths.js';

/** Lifecycle statuses from forge-api-core: CATALOG_ELIGIBLE_STATUS + draft/review. */
const PACK_STATUSES = ['draft', 'review', 'published', 'publish', 'deployed', 'verified', 'rarity_update'] as const;

const PackSchema = z.object({
  pack_id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  status: z.enum(PACK_STATUSES),
  visibility: z.enum(['public', 'private']).optional(),
  card_theme: z.string().optional(),
  trust_score: z.number().min(0).max(100).optional(),
  verification_state: z.enum(['verified', 'not_verified', 'pending']).optional(),
});

const program = new Command('validate')
  .description('Validate packs against schema')
  .argument('[pack-id]', 'Specific pack to validate, or "all"')
  .option('--strict', 'Fail on warnings')
  .action(async (packId = 'all', options) => {
    printHeader('Pack Validation');

    const { root, source } = resolveRepoRoot();
    const catalogPath = catalogJsonPathForRoot(root);

    if (!existsSync(catalogPath)) {
      printError(`catalog.json not found. Searched from: ${process.cwd()} (source: ${source})`);
      printInfo('Set FORGE_REPO_ROOT or run from the repo root.');
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
