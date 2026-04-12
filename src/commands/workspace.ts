import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { homedir } from 'os';
import { 
  loadWorkspaces, 
  addWorkspace, 
  removeWorkspace, 
  getWorkspace, 
  setDefaultWorkspace,
  detectWorkspaces,
  importCurrentDirectory,
  switchToWorkspace,
  getWorkspaceStats
} from '../lib/workspaceManager.js';
import { printHeader, printSuccess, printError, printInfo, printWarning } from '../lib/output.js';
import { execa } from 'execa';

const program = new Command('workspace')
  .description('Manage multiple Forge workspaces')
  .alias('ws')
  .addCommand(
    new Command('list')
      .description('List all workspaces')
      .alias('ls')
      .option('--json', 'output as JSON')
      .action(async (options) => {
        const workspaces = await loadWorkspaces();
        
        if (options.json) {
          console.log(JSON.stringify(workspaces, null, 2));
          return;
        }
        
        printHeader('Workspaces');
        
        if (workspaces.length === 0) {
          printInfo('No workspaces configured');
          printInfo('Add current directory: forge workspace add .');
          printInfo('Detect projects: forge workspace detect');
          return;
        }
        
        const { default: Table } = await import('cli-table3');
        const table = new Table({
          head: [chalk.bold('Name'), chalk.bold('Path'), chalk.bold('Default'), chalk.bold('Last Accessed')],
          colWidths: [20, 50, 10, 20],
          style: { head: ['cyan'] }
        });
        
        for (const ws of workspaces) {
          const name = ws.isDefault 
            ? chalk.bold.green(ws.name + ' ★') 
            : ws.color 
              ? chalk.hex(ws.color)(ws.name)
              : ws.name;
          
          const path = chalk.gray(ws.path.replace(homedir(), '~'));
          const isDefault = ws.isDefault ? chalk.green('Yes') : chalk.gray('No');
          const lastAccessed = ws.lastAccessed 
            ? new Date(ws.lastAccessed).toLocaleDateString()
            : chalk.gray('Never');
          
          table.push([name, path, isDefault, lastAccessed]);
        }
        
        console.log(table.toString());
        printInfo(`\nTotal: ${workspaces.length} workspace(s)`);
      })
  )
  .addCommand(
    new Command('add')
      .description('Add a workspace')
      .argument('<name>', 'workspace name')
      .argument('[path]', 'workspace path', process.cwd())
      .option('-d, --description <text>', 'workspace description')
      .option('-t, --tags <tags>', 'comma-separated tags')
      .option('--default', 'set as default workspace')
      .action(async (name, path, options) => {
        printHeader('Add Workspace');
        
        const tags = options.tags?.split(',').map((t: string) => t.trim()).filter(Boolean);
        
        try {
          const workspace = await addWorkspace(name, path, {
            description: options.description,
            tags,
            makeDefault: options.default
          });
          
          printSuccess(`Workspace added: ${chalk.yellow(workspace.name)}`);
          printInfo(`Path: ${chalk.gray(workspace.path)}`);
          
          if (workspace.isDefault) {
            printInfo('Set as default workspace');
          }
          
        } catch (error: any) {
          printError(error.message);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('remove')
      .description('Remove a workspace')
      .alias('rm')
      .argument('<name-or-id>', 'workspace name or ID')
      .action(async (nameOrId) => {
        printHeader('Remove Workspace');
        
        const workspace = await getWorkspace(nameOrId);
        if (!workspace) {
          printError(`Workspace not found: ${nameOrId}`);
          process.exit(1);
        }
        
        printWarning(`Removing workspace: ${chalk.bold(workspace.name)}`);
        printInfo(`Path: ${chalk.gray(workspace.path)}`);
        
        const success = await removeWorkspace(workspace.id);
        if (success) {
          printSuccess('Workspace removed');
        } else {
          printError('Failed to remove workspace');
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('switch')
      .description('Switch to a workspace')
      .alias('use')
      .argument('<name-or-id>', 'workspace name or ID')
      .action(async (nameOrId) => {
        printHeader('Switch Workspace');
        
        const workspace = await switchToWorkspace(nameOrId);
        if (!workspace) {
          printError(`Workspace not found: ${nameOrId}`);
          process.exit(1);
        }
        
        printSuccess(`Switched to: ${chalk.yellow(workspace.name)}`);
        printInfo(`Path: ${chalk.gray(workspace.path)}`);
        
        // Suggest next steps
        console.log('');
        printInfo('Next steps:');
        printInfo(`  cd "${workspace.path}"`);
        printInfo('  forge status');
      })
  )
  .addCommand(
    new Command('default')
      .description('Set default workspace')
      .argument('<name-or-id>', 'workspace name or ID')
      .action(async (nameOrId) => {
        const workspace = await getWorkspace(nameOrId);
        if (!workspace) {
          printError(`Workspace not found: ${nameOrId}`);
          process.exit(1);
        }
        
        await setDefaultWorkspace(workspace.id);
        printSuccess(`Default workspace set: ${chalk.yellow(workspace.name)}`);
      })
  )
  .addCommand(
    new Command('detect')
      .description('Detect workspaces in common locations')
      .option('--add', 'add detected workspaces automatically')
      .action(async (options) => {
        printHeader('Detect Workspaces');
        
        const spinner = ora('Scanning for projects...').start();
        
        try {
          const detected = await detectWorkspaces();
          spinner.stop();
          
          if (detected.length === 0) {
            printInfo('No Forge projects detected');
            return;
          }
          
          printInfo(`Found ${detected.length} potential project(s):\n`);
          
          const { default: Table } = await import('cli-table3');
          const table = new Table({
            head: [chalk.bold('Name'), chalk.bold('Path'), chalk.bold('Confidence')],
            colWidths: [25, 50, 12],
            style: { head: ['cyan'] }
          });
          
          for (const d of detected) {
            const confidence = d.confidence === 'high' 
              ? chalk.green('High') 
              : d.confidence === 'medium'
                ? chalk.yellow('Medium')
                : chalk.gray('Low');
            
            table.push([d.name, chalk.gray(d.path), confidence]);
          }
          
          console.log(table.toString());
          
          if (options.add) {
            console.log('');
            let added = 0;
            
            for (const d of detected) {
              if (d.confidence === 'high') {
                try {
                  await addWorkspace(d.name, d.path);
                  printSuccess(`Added: ${d.name}`);
                  added++;
                } catch {
                  // Skip if already exists
                }
              }
            }
            
            printInfo(`\nAdded ${added} workspace(s)`);
          } else {
            console.log('');
            printInfo('Run with --add to automatically add high-confidence projects');
          }
          
        } catch (error: any) {
          spinner.fail('Detection failed');
          printError(error.message);
        }
      })
  )
  .addCommand(
    new Command('info')
      .description('Show workspace details and statistics')
      .argument('<name-or-id>', 'workspace name or ID')
      .action(async (nameOrId) => {
        const workspace = await getWorkspace(nameOrId);
        if (!workspace) {
          printError(`Workspace not found: ${nameOrId}`);
          process.exit(1);
        }
        
        printHeader(`Workspace: ${workspace.name}`);
        
        console.log(`ID:          ${chalk.gray(workspace.id)}`);
        console.log(`Name:        ${chalk.yellow(workspace.name)}`);
        console.log(`Path:        ${chalk.cyan(workspace.path)}`);
        console.log(`Default:     ${workspace.isDefault ? chalk.green('Yes') : chalk.gray('No')}`);
        console.log(`Created:     ${new Date(workspace.createdAt).toLocaleString()}`);
        
        if (workspace.description) {
          console.log(`Description: ${workspace.description}`);
        }
        
        if (workspace.tags && workspace.tags.length > 0) {
          console.log(`Tags:        ${workspace.tags.map(t => chalk.blue(t)).join(', ')}`);
        }
        
        if (workspace.lastAccessed) {
          console.log(`Last Used:   ${new Date(workspace.lastAccessed).toLocaleString()}`);
        }
        
        // Get stats
        console.log('');
        const spinner = ora('Gathering statistics...').start();
        
        const stats = await getWorkspaceStats(workspace.id);
        spinner.stop();
        
        if (stats) {
          console.log(chalk.bold('Statistics:'));
          console.log(`  Disk Size:    ${(stats.diskSize / 1024 / 1024).toFixed(1)} MB`);
          console.log(`  File Count:   ${stats.fileCount.toLocaleString()}`);
          
          if (stats.gitBranch) {
            console.log(`  Git Branch:   ${chalk.green(stats.gitBranch)}`);
          }
          
          if (stats.gitCommits) {
            console.log(`  Commits:      ${stats.gitCommits.toLocaleString()}`);
          }
        }
      })
  )
  .addCommand(
    new Command('init')
      .description('Import current directory as workspace')
      .option('-n, --name <name>', 'custom name (default: directory name)')
      .action(async (options) => {
        printHeader('Import Current Directory');
        
        try {
          const workspace = await importCurrentDirectory();
          if (!workspace) {
            printWarning('Current directory is already a workspace');
            return;
          }
          printSuccess(`Workspace imported: ${chalk.yellow(workspace.name)}`);
          printInfo(`Path: ${chalk.gray(workspace.path)}`);
        } catch (error: any) {
          printError(error.message);
          process.exit(1);
        }
      })
  );

export default program;
