import { Command } from 'commander';
import { ForgeApiClient } from '../../lib/forgeApiClient.js';
import { printHeader, printInfo, printError } from '../../lib/output.js';
import { config } from '../../lib/configManager.js';
const p = new Command('me')
    .description('Show authenticated user profile')
    .option('--json', 'output as JSON')
    .action(async (o) => {
    const cfg = config.get();
    const baseUrl = cfg.remote?.baseUrl;
    const hasKey = !!cfg.remote?.apiKey;
    if (!baseUrl) {
        printError('No remote configured. Run: forge remote login --api-key <key>');
        return;
    }
    if (!hasKey) {
        printError('No API key set. Run: forge remote login --api-key <key>');
        printInfo('  or open browser: forge remote login');
        return;
    }
    const client = new ForgeApiClient({ baseUrl, apiKey: cfg.remote?.apiKey });
    try {
        const user = await client.getProfile();
        if (!user) {
            printError('Authentication failed — your API key may be invalid or expired.');
            printInfo('Update key: forge remote login --api-key <new-key>');
            return;
        }
        if (o.json) {
            // Strip sensitive fields before JSON output
            const safeOutput = {
                email: user.email,
                role: user.role,
                tier: user.tier,
                display_name: user.display_name,
                created_at: user.created_at,
            };
            console.log(JSON.stringify(safeOutput, null, 2));
            return;
        }
        printHeader('Remote Profile');
        printInfo('Email:     ' + user.email);
        printInfo('Role:      ' + user.role);
        printInfo('Tier:      ' + user.tier);
        if (user.display_name)
            printInfo('Name:      ' + user.display_name);
        printInfo('Joined:    ' + new Date(user.created_at * 1000).toLocaleDateString());
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('401') || msg.includes('Unauthorized')) {
            printError('Authentication failed — invalid or expired API key.');
            printInfo('Update key: forge remote login --api-key <new-key>');
        }
        else if (msg.includes('fetch') || msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED')) {
            printError('Could not reach the remote server. Check:');
            printInfo('  • Is the Forge instance running? (' + baseUrl + ')');
            printInfo('  • Is your network connection working?');
        }
        else {
            printError('Failed: ' + msg);
        }
    }
});
export default p;
//# sourceMappingURL=me.js.map