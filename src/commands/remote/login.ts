import { Command } from 'commander';
import open from 'open';
import { printHeader, printInfo, printSuccess } from '../../lib/output.js';
import { config } from '../../lib/configManager.js';
import { detectWsl } from '../../lib/wslDetector.js';
const p = new Command('login').description('Open login in browser or set API key')
  .option('--url <url>', 'Forge instance URL', 'https://forge.tekup.dk').option('--api-key <key>', 'Set API key directly')
  .action(async (o) => {
    if (o.apiKey) { const cur = config.get().remote || { baseUrl: o.url }; config.set('remote', { ...cur, apiKey: o.apiKey, baseUrl: o.url }); printSuccess('API key saved to config'); return; }
    const loginUrl = o.url + '/login'; printHeader('Forge Remote Login'); printInfo('Opening: ' + loginUrl);
    const wsl = detectWsl(); const opts = wsl.isWsl ? { app: { name: 'cmd.exe', arguments: ['/c', 'start'] } } : {};
    try { await open(loginUrl, opts); printInfo('Login in browser, then verify with: forge remote me'); } catch { printInfo('Open manually: ' + loginUrl); }
  });
export default p;
