import { Command } from 'commander';
import { config } from '../lib/configManager.js';
import { printHeader, printInfo, printSuccess, printError, printWarning } from '../lib/output.js';
/**
 * Parse a string value to a typed JavaScript value.
 * "true"/"false" → boolean, numeric strings → number, else string.
 */
function coerce(value) {
    if (value === 'true')
        return true;
    if (value === 'false')
        return false;
    const n = Number(value);
    if (!isNaN(n) && value.trim() !== '')
        return n;
    return value;
}
/**
 * Get a nested value from an object using a dot-separated path.
 * Returns undefined if any segment is missing.
 */
function getNestedValue(obj, path) {
    return path.split('.').reduce((acc, key) => {
        if (acc && typeof acc === 'object')
            return acc[key];
        return undefined;
    }, obj);
}
/**
 * Set a nested value on an object using a dot-separated path.
 * Creates intermediate objects as needed.
 */
function setNestedValue(obj, path, value) {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        if (current[key] === undefined || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }
    current[parts[parts.length - 1]] = value;
}
const program = new Command('config')
    .description('Manage CLI configuration (~/.forge/config.json)')
    .addCommand(new Command('get')
    .description('Show current configuration (or a specific key)')
    .argument('[key]', 'optional dot-path key (e.g. ports.web)')
    .option('--json', 'force JSON output even for scalar values')
    .action((key, options) => {
    const cfg = config.get();
    if (key) {
        const value = getNestedValue(cfg, key);
        if (value === undefined) {
            printError(`Key not found: ${key}`);
            process.exit(1);
        }
        if (options.json || typeof value === 'object') {
            console.log(JSON.stringify(value, null, 2));
        }
        else {
            console.log(String(value));
        }
        return;
    }
    printHeader('Forge Configuration');
    console.log(JSON.stringify(cfg, null, 2));
    printInfo(`\nFile: ${getConfigFilePath()}`);
}))
    .addCommand(new Command('set')
    .description('Set a configuration value (supports dot-path for nested keys)')
    .argument('<key>', 'Config key, e.g. ports.web, browser, mcpRegistry.pythonRuntime')
    .argument('<value>', 'Value to set (booleans and numbers are coerced automatically)')
    .action((key, rawValue) => {
    const value = coerce(rawValue);
    // For top-level keys, use the typed ConfigManager.set
    if (!key.includes('.')) {
        const topKey = key;
        try {
            config.set(topKey, value);
        }
        catch (err) {
            printError(`Failed to set ${key}: ${err.message}`);
            process.exit(1);
        }
    }
    else {
        // Nested dot-path: read full config, update in-place, write back top-level key
        const cfg = config.get();
        const topKey = key.split('.')[0];
        const topValue = cfg[topKey];
        if (topValue === undefined) {
            printError(`Unknown top-level key: ${topKey}`);
            printInfo('Valid keys: ' + Object.keys(cfg).join(', '));
            process.exit(1);
        }
        // Clone the top-level object and mutate
        const updated = JSON.parse(JSON.stringify(topValue));
        const subPath = key.split('.').slice(1).join('.');
        setNestedValue(updated, subPath, value);
        try {
            config.set(topKey, updated);
        }
        catch (err) {
            printError(`Failed to set ${key}: ${err.message}`);
            process.exit(1);
        }
    }
    printSuccess(`Set ${key} = ${JSON.stringify(value)}`);
    printInfo('Saved to: ' + getConfigFilePath());
}))
    .addCommand(new Command('reset')
    .description('Reset all configuration to defaults')
    .option('--yes', 'skip confirmation prompt')
    .action(async (options) => {
    if (!options.yes) {
        const { default: prompts } = await import('prompts');
        const { confirmed } = await prompts({
            type: 'confirm',
            name: 'confirmed',
            message: 'Reset all Forge CLI configuration to defaults?',
            initial: false,
        });
        if (!confirmed) {
            printInfo('Aborted.');
            return;
        }
    }
    try {
        // Conf exposes .clear() to wipe all stored values, then defaults take over
        config.config.clear();
        printSuccess('Configuration reset to defaults.');
        printInfo('All settings are now back to their defaults.');
        console.log(JSON.stringify(config.get(), null, 2));
    }
    catch {
        // Fallback: instruct manual delete
        printWarning('Could not reset automatically.');
        printInfo('Manually delete: ' + getConfigFilePath());
    }
}));
function getConfigFilePath() {
    try {
        return config.config.path;
    }
    catch {
        return '~/.forge/config.json';
    }
}
export default program;
//# sourceMappingURL=config.js.map