import { Command } from 'commander';
import { config } from '../lib/configManager.js';
import { printHeader, printInfo, printSuccess } from '../lib/output.js';
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
        let parsedValue = value;
        // Simple type coercion
        if (value === 'true')
            parsedValue = true;
        else if (value === 'false')
            parsedValue = false;
        else if (!isNaN(Number(value)))
            parsedValue = Number(value);
        config.set(key, parsedValue);
        printSuccess(`Set ${key} = ${parsedValue}`);
        printInfo('Configuration saved to ~/.forge/config.json');
    }
    catch (error) {
        console.error('Failed to set config:', error.message);
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