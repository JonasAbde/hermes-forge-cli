import { Command } from 'commander';
import { execa } from 'execa';
import { existsSync } from 'fs';
import { readFile, readdir, stat, mkdir, writeFile, copyFile } from 'fs/promises';
import { join, basename, dirname } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { printHeader, printSuccess, printError, printInfo, printWarning } from '../../lib/output.js';

interface PackInfo {
  id: string;
  name: string;
  path: string;
  hasMetadata: boolean;
  hasCutouts: boolean;
  cutoutCount: number;
  metadata?: any;
}

interface BuildOptions {
  packId?: string;
  all: boolean;
  cutoutsOnly: boolean;
  metadataOnly: boolean;
  watch: boolean;
  output?: string;
}

async function findPacks(packId?: string): Promise<PackInfo[]> {
  const packsDir = join(process.cwd(), 'server', 'data', 'packs');
  
  if (!existsSync(packsDir)) {
    throw new Error(`Packs directory not found: ${packsDir}`);
  }
  
  const packs: PackInfo[] = [];
  
  if (packId) {
    // Single pack mode
    const packPath = join(packsDir, packId);
    if (!existsSync(packPath)) {
      throw new Error(`Pack not found: ${packId}`);
    }
    
    packs.push(await getPackInfo(packId, packPath));
  } else {
    // All packs mode
    const entries = await readdir(packsDir, { withFileTypes: true });
    const packDirs = entries.filter(e => e.isDirectory());
    
    for (const dir of packDirs) {
      const packPath = join(packsDir, dir.name);
      packs.push(await getPackInfo(dir.name, packPath));
    }
  }
  
  return packs;
}

async function getPackInfo(id: string, path: string): Promise<PackInfo> {
  const metadataPath = join(path, 'metadata.json');
  const cutoutsDir = join(path, 'cutouts');
  
  const hasMetadata = existsSync(metadataPath);
  const hasCutouts = existsSync(cutoutsDir);
  
  let cutoutCount = 0;
  if (hasCutouts) {
    try {
      const files = await readdir(cutoutsDir);
      cutoutCount = files.filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.svg')).length;
    } catch {
      // Ignore
    }
  }
  
  let metadata;
  if (hasMetadata) {
    try {
      const content = await readFile(metadataPath, 'utf8');
      metadata = JSON.parse(content);
    } catch {
      // Ignore parse errors
    }
  }
  
  return {
    id,
    name: metadata?.name || id,
    path,
    hasMetadata,
    hasCutouts,
    cutoutCount,
    metadata
  };
}

async function buildMetadata(pack: PackInfo, outputDir: string): Promise<void> {
  // Ensure output directory exists
  await mkdir(outputDir, { recursive: true });
  
  // Read source metadata
  const metadataPath = join(pack.path, 'metadata.json');
  if (!existsSync(metadataPath)) {
    throw new Error(`Metadata file not found: ${metadataPath}`);
  }
  
  const content = await readFile(metadataPath, 'utf8');
  const metadata = JSON.parse(content);
  
  // Add build timestamp
  metadata._builtAt = new Date().toISOString();
  
  // Write to output
  const outputPath = join(outputDir, `${pack.id}.json`);
  await writeFile(outputPath, JSON.stringify(metadata, null, 2));
}

async function buildCutouts(pack: PackInfo, outputDir: string): Promise<number> {
  const cutoutsDir = join(pack.path, 'cutouts');
  if (!existsSync(cutoutsDir)) {
    return 0;
  }
  
  const outputCutoutsDir = join(outputDir, 'cutouts', pack.id);
  await mkdir(outputCutoutsDir, { recursive: true });
  
  const files = await readdir(cutoutsDir);
  const imageFiles = files.filter(f => 
    f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.svg')
  );
  
  let copied = 0;
  for (const file of imageFiles) {
    const src = join(cutoutsDir, file);
    const dest = join(outputCutoutsDir, file);
    
    try {
      await copyFile(src, dest);
      copied++;
    } catch (error) {
      printWarning(`Failed to copy ${file}`);
    }
  }
  
  return copied;
}

async function buildPack(pack: PackInfo, options: BuildOptions): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  try {
    const outputDir = options.output || join(process.cwd(), 'dist', 'packs');
    
    // Build metadata
    if (!options.cutoutsOnly) {
      try {
        await buildMetadata(pack, outputDir);
      } catch (error: any) {
        errors.push(`Metadata: ${error.message}`);
      }
    }
    
    // Build cutouts
    if (!options.metadataOnly) {
      try {
        const copied = await buildCutouts(pack, outputDir);
        if (copied === 0 && pack.hasCutouts) {
          errors.push('Cutouts: No files copied');
        }
      } catch (error: any) {
        errors.push(`Cutouts: ${error.message}`);
      }
    }
    
    return { success: errors.length === 0, errors };
  } catch (error: any) {
    return { success: false, errors: [error.message] };
  }
}

const program = new Command('build')
  .description('Build pack metadata and cutouts')
  .argument('[pack-id]', 'specific pack to build (default: all)')
  .option('--all', 'build all packs (default if no pack-id specified)')
  .option('--cutouts-only', 'only build cutout assets')
  .option('--metadata-only', 'only build metadata files')
  .option('-w, --watch', 'watch mode - rebuild on changes')
  .option('-o, --output <dir>', 'output directory', 'dist/packs')
  .action(async (packId, options) => {
    printHeader('Pack Build');
    
    try {
      // Find packs to build
      const packs = await findPacks(packId);
      
      if (packs.length === 0) {
        printWarning('No packs found to build');
        return;
      }
      
      printInfo(`Found ${packs.length} pack(s) to build`);
      
      // Show what will be built
      console.log('');
      for (const pack of packs) {
        const buildTargets: string[] = [];
        if (!options.cutoutsOnly && pack.hasMetadata) buildTargets.push('metadata');
        if (!options.metadataOnly && pack.hasCutouts) buildTargets.push('cutouts');
        
        const status = buildTargets.length > 0 
          ? chalk.gray(`[${buildTargets.join(', ')}]`)
          : chalk.yellow('[nothing to build]');
        
        console.log(`  ${chalk.cyan('•')} ${chalk.bold(pack.name)} ${status}`);
        
        if (pack.hasCutouts) {
          console.log(`    ${chalk.gray(`${pack.cutoutCount} cutouts`)}`);
        }
      }
      console.log('');
      
      // Build each pack
      const results: Array<{ pack: PackInfo; success: boolean; errors: string[] }> = [];
      
      for (const pack of packs) {
        const spinner = ora(`Building ${pack.name}...`).start();
        
        const result = await buildPack(pack, options);
        
        if (result.success) {
          spinner.succeed(`${pack.name} built`);
        } else {
          spinner.fail(`${pack.name} failed`);
          result.errors.forEach(err => printError(`  • ${err}`));
        }
        
        results.push({ pack, ...result });
      }
      
      // Summary
      console.log('');
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      if (failCount === 0) {
        printSuccess(`All ${successCount} pack(s) built successfully`);
        printInfo(`Output: ${options.output}`);
      } else {
        printWarning(`${successCount} succeeded, ${failCount} failed`);
        process.exit(1);
      }
      
      // Watch mode
      if (options.watch) {
        printInfo('\nWatching for changes... (Ctrl+C to stop)');
        
        // Simple watch implementation using polling
        const { watch } = await import('fs');
        
        const watchers: any[] = [];
        for (const pack of packs) {
          const watcher = watch(pack.path, { recursive: true }, async () => {
            printInfo(`\nChange detected in ${pack.name}, rebuilding...`);
            const result = await buildPack(pack, options);
            if (result.success) {
              printSuccess(`${pack.name} rebuilt`);
            } else {
              printError(`${pack.name} rebuild failed`);
            }
          });
          watchers.push(watcher);
        }
        
        process.on('SIGINT', () => {
          watchers.forEach(w => w.close());
          console.log('\n');
          process.exit(0);
        });
        
        // Keep running
        await new Promise(() => {});
      }
      
    } catch (error: any) {
      printError(`Build failed: ${error.message}`);
      process.exit(1);
    }
  });

export default program;
