import { Command } from 'commander';
import open from 'open';
import { printHeader, printInfo, printError } from '../lib/output.js';
import { detectWsl } from '../lib/wslDetector.js';
import { config } from '../lib/configManager.js';
function buildTargets(cfg) {
    const web = cfg.ports.web;
    const api = cfg.ports.api;
    const docs = cfg.ports.docs;
    return {
        docs: { url: `http://127.0.0.1:${docs}`, name: 'Forge Docs' },
        hub: { url: `http://127.0.0.1:${web}/docs`, name: 'Documentation Hub' },
        showcase: { url: `http://127.0.0.1:${web}/showcase`, name: 'Showcase' },
        catalog: { url: `http://127.0.0.1:${web}/catalog`, name: 'Catalog' },
        chat: { url: `http://127.0.0.1:${web}/chat`, name: 'Chat handoff' },
        api: { url: `http://127.0.0.1:${api}/health`, name: 'API health' },
    };
}
const VALID_TARGETS = ['docs', 'hub', 'showcase', 'catalog', 'chat', 'api'];
const program = new Command('open')
    .description('Open a Forge URL in the browser')
    .argument('<target>', `Target to open: ${VALID_TARGETS.join(', ')}`)
    .action(async (target) => {
    const normalized = target.toLowerCase();
    const cfg = config.get();
    const targets = buildTargets(cfg);
    const entry = targets[normalized];
    if (!entry) {
        printError(`Unknown target: ${target}`);
        console.log(`Available targets: ${VALID_TARGETS.join(', ')}`);
        process.exit(1);
    }
    printHeader(`Open ${entry.name}`);
    const wsl = detectWsl();
    printInfo(`Opening: ${entry.url}`);
    try {
        if (wsl.isWsl) {
            // WSL: delegate to Windows cmd.exe so the Windows default browser opens
            await open(entry.url, { app: { name: 'cmd.exe', arguments: ['/c', 'start', entry.url] } });
        }
        else {
            await open(entry.url);
        }
        printInfo('Browser opened successfully.');
    }
    catch (err) {
        const e = err;
        printError(`Failed to open browser: ${e.message ?? String(err)}`);
        console.log(`Visit manually: ${entry.url}`);
    }
});
export default program;
//# sourceMappingURL=open.js.map