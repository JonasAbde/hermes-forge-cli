import { Command } from 'commander';
import chalk from 'chalk';
import prompts from 'prompts';
import { printHeader, printSection, printInfo, printSuccess, printWarning, printError, printKV, printTable } from '../lib/output.js';
import {
  loadExtensions,
  clearExtensionCache,
  ensureExtensionDirs,
  getUserExtensionDir,
  getProjectExtensionDir,
  extensionCount,
  isExtensionInstalled,
} from '../lib/extensionManager.js';

const program = new Command('plugin')
  .description('Manage Forge plugins and extensions')
  .alias('plugins');

// ── list ────────────────────────────────────────────────────────

program
  .command('list')
  .description('List installed extensions')
  .option('--json', 'output as JSON')
  .action((opts: { json?: boolean }) => {
    const extensions = loadExtensions();

    if (opts.json) {
      console.log(JSON.stringify(extensions.map(e => ({
        name: e.manifest.name,
        version: e.manifest.version,
        description: e.manifest.description,
        enabled: e.enabled,
        dir: e.dir,
        commands: e.manifest.commands?.map(c => c.name) || [],
        hooks: e.manifest.hooks ? Object.keys(e.manifest.hooks) : [],
      })), null, 2));
      return;
    }

    if (extensions.length === 0) {
      printHeader('Forge Extensions');
      printInfo('No extensions installed.');
      printInfo('');
      printInfo(`  Extension directories:`);
      printInfo(`    User: ${getUserExtensionDir()}`);
      printInfo(`    Project: ${getProjectExtensionDir()}`);
      printInfo('');
      printInfo('  Create an extension:');
      printInfo(`    mkdir -p ${getUserExtensionDir()}/my-ext`);
      printInfo('    Create manifest.yaml with commands');
      return;
    }

    printHeader('Forge Extensions');
    printInfo(`${extensionCount()} extension(s) installed`);
    console.log('');

    const headers = ['Name', 'Version', 'Commands', 'Hooks', 'Status'];
    const rows = extensions.map(e => [
      e.manifest.name,
      e.manifest.version,
      String(e.manifest.commands?.length || 0),
      e.manifest.hooks ? Object.keys(e.manifest.hooks).join(', ') : '—',
      e.enabled ? chalk.green('enabled') : chalk.gray('disabled'),
    ]);

    printTable(headers, rows);
    console.log('');
    printInfo(`User extension dir: ${getUserExtensionDir()}`);
    printInfo(`Project extension dir: ${getProjectExtensionDir()}`);
  });

// ── install ──────────────────────────────────────────────────────

program
  .command('install <path>')
  .description('Install an extension from a local path or git URL')
  .option('-n, --name <name>', 'Override extension name')
  .action(async (installPath: string, opts: { name?: string }) => {
    printHeader('Install Extension');

    const { execa } = await import('execa');
    const { existsSync, mkdirSync } = await import('node:fs');
    const { join } = await import('node:path');

    let name = opts.name;

    if (installPath.startsWith('http') || installPath.startsWith('git@')) {
      // Git URL — clone
      printInfo(`Cloning from ${installPath}...`);
      try {
        const targetDir = join(getUserExtensionDir(), 'tmp-clone');
        await execa('git', ['clone', installPath, targetDir], { timeout: 30000 });

        // Check for manifest
        const { readdirSync } = await import('node:fs');
        const items = readdirSync(targetDir);
        const hasManifest = items.some(i => i === 'manifest.yaml' || i === 'manifest.yml' || i === 'manifest.json');

        if (!hasManifest) {
          // Maybe it's in a subdirectory
          for (const item of items) {
            const itemPath = join(targetDir, item);
            if (itemPath) {
              const subItems = readdirSync(itemPath);
              if (subItems.some((s: string) => s === 'manifest.yaml' || s === 'manifest.yml' || s === 'manifest.json')) {
                // Move contents up
                const { renameSync } = await import('node:fs');
                // TODO: handle nested structure
                break;
              }
            }
          }
        }
      } catch (err: any) {
        printError(`Failed to clone: ${err.message}`);
        return;
      }
    } else {
      // Local path
      const { resolve } = await import('node:path');
      const fullPath = resolve(installPath);
      const { statSync } = await import('node:fs');

      if (!existsSync(fullPath)) {
        printError(`Path not found: ${fullPath}`);
        return;
      }

      const stat = statSync(fullPath);
      if (!stat.isDirectory()) {
        printError(`Path must be a directory: ${fullPath}`);
        return;
      }

      // Check manifest
      const { readdirSync } = await import('node:fs');
      const items = readdirSync(fullPath);
      const hasManifest = items.some(i => i === 'manifest.yaml' || i === 'manifest.yml' || i === 'manifest.json');

      if (!hasManifest) {
        printError(`No manifest.yaml found in ${fullPath}`);
        printInfo('Extensions require a manifest.yaml file');
        return;
      }

      // Determine name from manifest or use the directory name
      if (!name) {
        const { readFileSync } = await import('node:fs');
        const yaml = await import('js-yaml');
        const manifestPath = items.find(i => i === 'manifest.yaml' || i === 'manifest.yml' || i === 'manifest.json');
        if (manifestPath) {
          const raw = readFileSync(join(fullPath, manifestPath), 'utf-8');
          const parsed = yaml.load(raw) as any;
          name = parsed?.name || installPath.split('/').pop() || 'unknown';
        } else {
          name = installPath.split('/').pop() || 'unknown';
        }
      }

      // Copy to extensions directory
      const targetDir = join(getUserExtensionDir(), name!);
      if (existsSync(targetDir)) {
        printWarning(`Extension '${name}' already exists at ${targetDir}`);
        const { confirmed } = await prompts({
          type: 'confirm',
          name: 'confirmed',
          message: 'Overwrite?',
          initial: false,
        });
        if (!confirmed) {
          printInfo('Install cancelled');
          return;
        }
      }

      mkdirSync(targetDir, { recursive: true });
      const { execa } = await import('execa');
      await execa('cp', ['-r', `${fullPath}/.`, targetDir], { timeout: 10000 });

      clearExtensionCache();
      printSuccess(`Extension '${name}' installed to ${targetDir}`);
    }
  });

// ── remove ───────────────────────────────────────────────────────

program
  .command('remove <name>')
  .alias('rm')
  .description('Remove an extension')
  .action(async (name: string) => {
    if (!isExtensionInstalled(name)) {
      printError(`Extension '${name}' not found`);
      return;
    }

    const { join } = await import('node:path');
    const { existsSync, rmSync } = await import('node:fs');

    // Try user dir first, then project dir
    const userDir = join(getUserExtensionDir(), name);
    const projectDir = join(getProjectExtensionDir(), name);

    let targetDir = '';
    if (existsSync(userDir)) {
      // Check if it's from a known path
      targetDir = userDir;
    } else if (existsSync(projectDir)) {
      targetDir = projectDir;
    } else {
      targetDir = userDir; // fallback
    }

    try {
      rmSync(targetDir, { recursive: true, force: true });
      clearExtensionCache();
      printSuccess(`Extension '${name}' removed`);
    } catch (err: any) {
      printError(`Failed to remove: ${err.message}`);
    }
  });

// ── dir ──────────────────────────────────────────────────────────

program
  .command('dir')
  .description('Show extension directories')
  .action(() => {
    printHeader('Extension Directories');
    printKV('User extensions', getUserExtensionDir());
    printKV('Project extensions', getProjectExtensionDir());
    printKV('Extensions installed', String(extensionCount()));
  });

export default program;
