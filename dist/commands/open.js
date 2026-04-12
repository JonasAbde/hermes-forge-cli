import { Command } from 'commander';
import open from 'open';
import { printHeader, printInfo, printError } from '../lib/output.js';
import { detectWsl } from '../lib/wslDetector.js';
import { config } from '../lib/configManager.js';
function errorMessage(error) {
    if (error instanceof Error)
        return error.message;
    return String(error);
}
const TARGETS = {
    docs: { url: 'http://127.0.0.1:5190', name: 'Forge Docs' },
    hub: { url: 'http://127.0.0.1:5180/docs', name: 'Documentation Hub' },
    showcase: { url: 'http://127.0.0.1:5180/showcase', name: 'Showcase' },
    api: { url: 'http://127.0.0.1:5181', name: 'API' }
};
const program = new Command('open')
    .description('Open various Forge URLs in browser')
    .argument('<target>', 'Target to open: docs, hub, showcase, api')
    .action(async (target) => {
    const normalized = target.toLowerCase();
    const entry = TARGETS[normalized];
    if (!entry) {
        printError(`Unknown target: ${target}`);
        console.log('Available targets: docs, hub, showcase, api');
        process.exit(1);
    }
    printHeader(`Open ${entry.name}`);
    const wsl = detectWsl();
    const cfg = config.get();
    let url = entry.url;
    // Adjust for custom ports if configured
    if (normalized === 'docs' && cfg.ports.docs !== 5190) {
        url = url.replace('5190', cfg.ports.docs.toString());
    }
    else if (normalized === 'hub' && cfg.ports.web !== 5180) {
        url = url.replace('5180', cfg.ports.web.toString());
    }
    printInfo(`Opening ${url}...`);
    const openOptions = wsl.isWsl
        ? { app: { name: 'cmd.exe', arguments: ['/c', 'start'] } }
        : {};
    try {
        await open(url, openOptions);
        printInfo('Browser opened successfully.');
    }
    catch (error) {
        printError(`Failed to open browser: ${errorMessage(error)}`);
        console.log(`Please visit manually: ${url}`);
    }
});
export default program;
//# sourceMappingURL=open.js.map