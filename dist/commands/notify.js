import { Command } from 'commander';
import chalk from 'chalk';
import { sendNotification, loadConfig, saveConfig, testNotifications } from '../lib/notifications.js';
import { printHeader, printSuccess, printError, printInfo, printWarning } from '../lib/output.js';
const program = new Command('notify')
    .description('Manage notification settings and send notifications')
    .addCommand(new Command('send')
    .description('Send a notification')
    .argument('<message>', 'notification message')
    .option('-t, --title <title>', 'notification title', 'Forge CLI')
    .option('--type <type>', 'notification type (info, success, warning, error)', 'info')
    .option('-c, --channel <channel>', 'channel (desktop, webhook, slack, discord)')
    .action(async (message, options) => {
    const validTypes = ['info', 'success', 'warning', 'error'];
    if (!validTypes.includes(options.type)) {
        printError(`Invalid type: ${options.type}`);
        printInfo(`Valid types: ${validTypes.join(', ')}`);
        process.exit(1);
    }
    printHeader('Send Notification');
    try {
        const channels = options.channel ? [options.channel] : undefined;
        const result = await sendNotification({
            title: options.title,
            message,
            type: options.type
        }, channels);
        if (result.sent.length > 0) {
            printSuccess(`Sent via: ${result.sent.join(', ')}`);
        }
        if (result.failed.length > 0) {
            printWarning(`Failed: ${result.failed.join(', ')}`);
        }
    }
    catch (error) {
        printError(error.message);
        process.exit(1);
    }
}))
    .addCommand(new Command('config')
    .description('View notification configuration')
    .option('--json', 'output as JSON')
    .action(async (options) => {
    const config = await loadConfig();
    if (options.json) {
        console.log(JSON.stringify(config, null, 2));
        return;
    }
    printHeader('Notification Configuration');
    console.log(`Enabled: ${config.enabled ? chalk.green('Yes') : chalk.red('No')}`);
    console.log('');
    console.log(chalk.bold('Channels:'));
    console.log(`  Desktop: ${config.channels.desktop ? chalk.green('Enabled') : chalk.gray('Disabled')}`);
    console.log(`  Webhook: ${config.channels.webhook ? chalk.green(config.channels.webhook.url) : chalk.gray('Not configured')}`);
    console.log(`  Slack: ${config.channels.slack ? chalk.green(config.channels.slack.webhookUrl) : chalk.gray('Not configured')}`);
    console.log(`  Discord: ${config.channels.discord ? chalk.green(config.channels.discord.webhookUrl) : chalk.gray('Not configured')}`);
    console.log('');
    console.log(chalk.bold('Rules:'));
    for (const rule of config.rules) {
        console.log(`  ${chalk.yellow(rule.event)} → ${rule.channels.join(', ')} (min: ${rule.minLevel})`);
    }
}))
    .addCommand(new Command('setup')
    .description('Configure notification channels')
    .option('--desktop', 'enable desktop notifications')
    .option('--no-desktop', 'disable desktop notifications')
    .option('--webhook <url>', 'set webhook URL')
    .option('--slack <url>', 'set Slack webhook URL')
    .option('--discord <url>', 'set Discord webhook URL')
    .action(async (options) => {
    printHeader('Configure Notifications');
    const config = await loadConfig();
    if (options.desktop !== undefined) {
        config.channels.desktop = options.desktop;
        printSuccess(`Desktop notifications ${options.desktop ? 'enabled' : 'disabled'}`);
    }
    if (options.webhook) {
        config.channels.webhook = { url: options.webhook };
        printSuccess(`Webhook configured: ${options.webhook}`);
    }
    if (options.slack) {
        config.channels.slack = { webhookUrl: options.slack };
        printSuccess(`Slack webhook configured`);
    }
    if (options.discord) {
        config.channels.discord = { webhookUrl: options.discord };
        printSuccess(`Discord webhook configured`);
    }
    await saveConfig(config);
    printInfo('\nConfiguration saved');
}))
    .addCommand(new Command('test')
    .description('Test all notification channels')
    .action(async () => {
    printHeader('Test Notifications');
    printInfo('Sending test notification to all configured channels...\n');
    const { results } = await testNotifications();
    for (const result of results) {
        if (result.success) {
            printSuccess(`${result.channel}: OK`);
        }
        else {
            printError(`${result.channel}: ${result.error || 'Failed'}`);
        }
    }
}));
export default program;
//# sourceMappingURL=notify.js.map