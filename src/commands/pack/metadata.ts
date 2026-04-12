import { Command } from 'commander';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { printHeader, printSuccess, printError, printInfo } from '../../lib/output.js';

/**
 * Generate compact per-pack metadata suitable for MCP tool payloads.
 * Output is a JSON array of lightweight objects: id, name, theme, trust_score,
 * verification_state, entrypoint, status.
 */
const program = new Command('metadata')
  .description('Generate compact metadata for MCP or external tooling')
  .option('--catalog', 'Only include catalog-eligible packs (public + published/deployed)')
  .option('--out <path>', 'Write output to file instead of stdout')
  .option('--format <fmt>', 'Output format: json (default) or ndjson', 'json')
  .action((options) => {
    printHeader('Pack Metadata');

    const catalogPath = 'server/data/catalog.json';
    if (!existsSync(catalogPath)) {
      printError('catalog.json not found at server/data/catalog.json');
      process.exit(1);
    }

    try {
      const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
      let packs = catalog.packs || [];

      const CATALOG_ELIGIBLE_STATUS = new Set([
        'published', 'publish', 'deployed', 'verified', 'rarity_update',
      ]);

      if (options.catalog) {
        packs = packs.filter(
          (p: any) =>
            p.visibility === 'public' && CATALOG_ELIGIBLE_STATUS.has(p.status),
        );
      }

      const meta = packs.map((p: any) => ({
        pack_id: p.pack_id,
        name: p.card_name || p.name || p.pack_id,
        slug: p.slug || null,
        theme: p.card_theme || null,
        status: p.status || null,
        visibility: p.visibility || 'private',
        trust_score: typeof p.trust_score === 'number' ? p.trust_score : null,
        verification_state: p.verification_state || null,
        entrypoint: p.entrypoint || null,
        summary: p.card_snippet || (p.summary_md ? p.summary_md.slice(0, 200) : null),
      }));

      let output: string;
      if (options.format === 'ndjson') {
        output = meta.map((m: any) => JSON.stringify(m)).join('\n');
      } else {
        output = JSON.stringify(meta, null, 2);
      }

      if (options.out) {
        writeFileSync(options.out, output, 'utf8');
        printSuccess(`Wrote metadata for ${meta.length} pack(s) to ${options.out}`);
      } else {
        console.log(output);
        printInfo(`\n${meta.length} pack(s) emitted.`);
      }
    } catch (error: any) {
      printError(`Failed to generate metadata: ${error.message}`);
      process.exit(1);
    }
  });

export default program;
