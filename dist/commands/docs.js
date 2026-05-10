import { Command } from 'commander';
import { execa } from 'execa';
import open from 'open';
import { printHeader, printInfo } from '../lib/output.js';
import { detectWsl } from '../lib/wslDetector.js';
function errorMessage(error) {
    if (error instanceof Error)
        return error.message;
    return String(error);
}
const program = new Command('docs')
    .description('Start Forge Docs (VitePress) and optionally open in browser')
    .option('--open', 'Open browser after starting', true)
    .option('--no-open', 'Do not open browser')
    .option('--port <number>', 'Override docs port', '5190')
    .action(async (options) => {
    printHeader('Forge Docs');
    const wsl = detectWsl();
    const port = parseInt(options.port, 10);
    const url = `http://127.0.0.1:${port}`;
    printInfo(`Starting VitePress on port ${port}...`);
    const docsProcess = execa('npm run docs:dev', {
        cwd: process.cwd(),
        stdio: 'inherit',
        shell: true,
        env: {
            ...process.env,
            PORT: port.toString()
        }
    });
    // Give server time to start
    await new Promise(resolve => setTimeout(resolve, 2500));
    if (options.open) {
        printInfo(`Opening ${url} in browser...`);
        const openOptions = wsl.isWsl
            ? { app: { name: 'cmd.exe', arguments: ['/c', 'start'] } }
            : {};
        try {
            await open(url, openOptions);
        }
        catch {
            console.warn('Could not open browser automatically. Please visit:', url);
        }
    }
    else {
        console.log(`Forge Docs running at: ${url}`);
    }
    // Keep process alive
    try {
        await docsProcess;
    }
    catch (error) {
        const maybeSignal = error?.signal;
        if (maybeSignal !== 'SIGINT') {
            console.error('Docs server error:', errorMessage(error));
        }
    }
});
export default program;
//# sourceMappingURL=docs.js.map