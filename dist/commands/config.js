import { Command } from 'commander';
import { config } from '../lib/configManager.js';
import { printHeader, printInfo, printSuccess } from '../lib/output.js';
function errorMessage(error) {
    if (error instanceof Error)
        return error.message;
    return String(error);
}
function parseConfigValue(value) {
    if (value === 'true')
        return true;
    if (value === 'false')
        return false;
    if (!Number.isNaN(Number(value)))
        return Number(value);
    return value;
}
const program = new Command('config')
    .description('Manage CLI configuration (~/.forge/config.json)')
    .addCommand(new Command('get')
    .description('Show current configuration')
    .action(() => {
    printHeader('Forge Configuration');
    console.log(JSON.stringify(config.get(), null, 2));
}))
    .addCommand(new Command('set')
    .description('Set a configuration value (key value)')
    .argument('<key>', 'Config key (e.g. ports.web, browser)')
    .argument('<value>', 'Value to set')
    .action((key, value) => {
    try {
        const parsedValue = parseConfigValue(value);
        // SECURITY: Only write values through ConfigManager to apply schema validation.
        config.set(key, parsedValue);
        printSuccess(`Set ${key} = ${parsedValue}`);
        printInfo('Configuration saved to ~/.forge/config.json');
    }
    catch (error) {
        console.error('Failed to set config:', errorMessage(error));
    }
}))
    .addCommand(new Command('reset')
    .description('Reset configuration to defaults')
    .action(() => {
    // ConfigManager uses defaults on new instance, but to reset we can delete and recreate
    console.log('Configuration reset to defaults (restart CLI to apply fully).');
    printInfo('Note: Full reset requires deleting ~/.forge/config.json manually for now.');
}));
export default program;
//# sourceMappingURL=config.js.map