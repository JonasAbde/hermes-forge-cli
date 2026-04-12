import { Command } from 'commander';
import chalk from 'chalk';
import { listInstalledPlugins, installPlugin, uninstallPlugin, updatePlugin, searchPlugins, executePlugin, validatePlugin, getPluginDir } from '../lib/pluginManager.js';
import { printHeader, printSuccess, printError, printInfo, printWarning } from '../lib/output.js';
import ora from 'ora';
const program = new Command('plugin')
    .description('Manage Forge CLI plugins')
    .addCommand(new Command('list')
    .description('List installed plugins')
    .option('--json', 'output as JSON')
    .action(async (options) => {
    const plugins = await listInstalledPlugins();
    if (options.json) {
        console.log(JSON.stringify(plugins, null, 2));
        return;
    }
    printHeader('Installed Plugins');
    if (plugins.length === 0) {
        printInfo('No plugins installed');
        printInfo('Search with: forge plugin search');
        printInfo('Install with: forge plugin install <name>');
        return;
    }
    const { default: Table } = await import('cli-table3');
    const table = new Table({
        head: [chalk.bold('Plugin'), chalk.bold('Version'), chalk.bold('Commands'), chalk.bold('Description')],
        colWidths: [25, 12, 20, 40],
        style: { head: ['cyan'] }
    });
    plugins.forEach(p => {
        table.push([
            p.name,
            chalk.gray(p.version),
            p.commands.join(', '),
            p.description.slice(0, 37) + (p.description.length > 37 ? '...' : '')
        ]);
    });
    console.log(table.toString());
    printInfo(`\nTotal: ${plugins.length} plugin(s)`);
}))
    .addCommand(new Command('search')
    .description('Search for available plugins')
    .argument('[query]', 'search query')
    .action(async (query) => {
    printHeader('Search Plugins');
    const spinner = ora('Searching...').start();
    try {
        const plugins = await searchPlugins(query);
        spinner.stop();
        if (plugins.length === 0) {
            printInfo('No plugins found');
            return;
        }
        console.log(chalk.gray(`Found ${plugins.length} plugin(s):\n`));
        plugins.forEach(p => {
            console.log(`${chalk.bold.cyan(p.name)} ${chalk.gray(p.version)}`);
            console.log(`  ${p.description}`);
            console.log(`  ${chalk.gray(`Author: ${p.author} • ${p.installs} installs`)}`);
            console.log('');
        });
        printInfo('Install with: forge plugin install <name>');
    }
    catch (error) {
        spinner.fail('Search failed');
        printError(error.message);
    }
}))
    .addCommand(new Command('install')
    .description('Install a plugin from npm or git')
    .argument('<source>', 'plugin name, npm package, or git URL')
    .option('-g, --global', 'install globally')
    .action(async (source, options) => {
    printHeader('Install Plugin');
    printInfo(`Installing: ${chalk.cyan(source)}`);
    const spinner = ora('Installing...').start();
    try {
        const plugin = await installPlugin(source, options);
        spinner.succeed(`Installed ${plugin.name}@${plugin.version}`);
        console.log('');
        printSuccess(`Plugin installed successfully!`);
        printInfo(`Commands added: ${plugin.commands.join(', ')}`);
        if (plugin.commands.length > 0) {
            console.log('');
            printInfo(`Try: forge ${plugin.commands[0]} --help`);
        }
    }
    catch (error) {
        spinner.fail('Installation failed');
        printError(error.message);
        process.exit(1);
    }
}))
    .addCommand(new Command('uninstall')
    .description('Uninstall a plugin')
    .alias('remove')
    .argument('<name>', 'plugin name')
    .action(async (name) => {
    printHeader('Uninstall Plugin');
    printWarning(`This will remove ${chalk.bold(name)}`);
    try {
        await uninstallPlugin(name);
        printSuccess(`Plugin ${name} uninstalled`);
    }
    catch (error) {
        printError(error.message);
        process.exit(1);
    }
}))
    .addCommand(new Command('update')
    .description('Update a plugin')
    .argument('<name>', 'plugin name')
    .action(async (name) => {
    printHeader('Update Plugin');
    const spinner = ora(`Updating ${name}...`).start();
    try {
        const plugin = await updatePlugin(name);
        spinner.succeed(`Updated to ${plugin.version}`);
        printSuccess(`${plugin.name}@${plugin.version} is now up to date`);
    }
    catch (error) {
        spinner.fail('Update failed');
        printError(error.message);
        process.exit(1);
    }
}))
    .addCommand(new Command('validate')
    .description('Validate a plugin directory')
    .argument('<path>', 'path to plugin directory')
    .action(async (pluginPath) => {
    printHeader('Validate Plugin');
    const { valid, errors } = await validatePlugin(pluginPath);
    if (valid) {
        printSuccess('Plugin structure is valid');
    }
    else {
        printError('Plugin validation failed');
        errors.forEach(e => printError(`  • ${e}`));
        process.exit(1);
    }
}))
    .addCommand(new Command('exec')
    .description('Execute a plugin command directly')
    .argument('<plugin>', 'plugin name')
    .argument('<command>', 'command to run')
    .argument('[args...]', 'arguments')
    .allowUnknownOption()
    .action(async (pluginName, command, args) => {
    try {
        const result = await executePlugin(pluginName, command, args);
        if (result.stdout) {
            console.log(result.stdout);
        }
        if (result.stderr) {
            console.error(result.stderr);
        }
        process.exit(result.exitCode);
    }
    catch (error) {
        printError(error.message);
        process.exit(1);
    }
}))
    .addCommand(new Command('create')
    .description('Create a new plugin from template')
    .argument('<name>', 'plugin name')
    .action(async (name) => {
    printHeader('Create Plugin');
    printInfo(`Creating plugin: ${chalk.bold(name)}`);
    const pluginDir = getPluginDir(name);
    // Basic plugin template
    const manifest = {
        name,
        version: '1.0.0',
        description: 'A Forge CLI plugin',
        author: '',
        main: 'index.js',
        commands: [
            {
                name: 'hello',
                description: 'Say hello from the plugin'
            }
        ]
    };
    const entryCode = `#!/usr/bin/env node
// ${name} plugin for Forge CLI

const command = process.argv[2];

switch (command) {
  case 'hello':
    console.log('Hello from ${name}!');
    break;
  default:
    console.log('Available commands: hello');
    process.exit(1);
}
`;
    const { mkdir, writeFile } = await import('fs/promises');
    await mkdir(pluginDir, { recursive: true });
    await writeFile(pluginDir + '/package.json', JSON.stringify(manifest, null, 2));
    await writeFile(pluginDir + '/index.js', entryCode);
    printSuccess(`Plugin ${name} created at:`);
    printInfo(`  ${pluginDir}`);
    printInfo('\nNext steps:');
    printInfo(`  1. Edit ${pluginDir}/index.js`);
    printInfo(`  2. Test with: forge plugin exec ${name} hello`);
}));
export default program;
//# sourceMappingURL=plugin.js.map