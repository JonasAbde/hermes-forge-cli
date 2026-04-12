/**
 * Interactive prompts for Forge CLI
 */
import prompts from 'prompts';
import chalk from 'chalk';
import { loadWorkspaces } from './workspaceManager.js';
function onCancel() {
    console.log(chalk.gray('\nCancelled'));
    process.exit(0);
}
export async function interactiveDev() {
    const response1 = await prompts({
        type: 'select',
        name: 'mode',
        message: 'Which services to start?',
        choices: [
            { title: 'Full stack (Web + API)', value: 'full' },
            { title: 'Web only', value: 'web-only' },
            { title: 'API only', value: 'api-only' },
            { title: 'Documentation only', value: 'docs-only' },
        ],
        initial: 0
    }, { onCancel });
    let withDocs = false;
    if (response1.mode === 'full') {
        const withDocsResponse = await prompts({
            type: 'confirm',
            name: 'value',
            message: 'Include documentation server?',
            initial: false
        }, { onCancel });
        withDocs = withDocsResponse.value || false;
    }
    const response2 = await prompts({
        type: 'number',
        name: 'portOffset',
        message: 'Port offset (0 for default ports)',
        initial: 0,
        min: 0,
        max: 100
    }, { onCancel });
    return {
        mode: response1.mode || 'full',
        withDocs,
        portOffset: response2.portOffset || 0
    };
}
export async function interactiveInit() {
    const response = await prompts([
        {
            type: 'text',
            name: 'projectName',
            message: 'Project name?',
            validate: (value) => value.length > 0 || 'Name is required'
        },
        {
            type: 'select',
            name: 'template',
            message: 'Choose a template:',
            choices: [
                { title: 'Agent Pack', value: 'pack', description: 'A new Agent Pack' },
                { title: 'Web Extension', value: 'web-extension', description: 'Browser extension' },
                { title: 'MCP Tool', value: 'mcp-tool', description: 'Custom MCP tool' },
                { title: 'Node Library', value: 'node-lib', description: 'NPM package' },
            ],
            initial: 0
        },
        {
            type: 'text',
            name: 'directory',
            message: 'Directory? (empty for current)',
            initial: ''
        }
    ], { onCancel });
    return {
        template: response.template || 'pack',
        projectName: response.projectName || 'my-project',
        directory: response.directory || response.projectName || '.'
    };
}
export async function interactivePluginInstall() {
    const availablePlugins = [
        { title: '@hermes-forge/plugin-deploy', value: '@hermes-forge/plugin-deploy' },
        { title: '@hermes-forge/plugin-analytics', value: '@hermes-forge/plugin-analytics' },
        { title: 'forge-plugin-llm', value: 'forge-plugin-llm' },
        { title: 'Other (custom)', value: 'custom' }
    ];
    const response1 = await prompts({
        type: 'select',
        name: 'pluginChoice',
        message: 'Which plugin to install?',
        choices: availablePlugins,
        initial: 0
    }, { onCancel });
    let customSource = '';
    if (response1.pluginChoice === 'custom') {
        const customResponse = await prompts({
            type: 'text',
            name: 'value',
            message: 'Plugin source (npm or git):',
            validate: (value) => value.length > 0 || 'Source required'
        }, { onCancel });
        customSource = customResponse.value || '';
    }
    const response2 = await prompts({
        type: 'confirm',
        name: 'global',
        message: 'Install globally?',
        initial: true
    }, { onCancel });
    return {
        source: response1.pluginChoice === 'custom' ? customSource : response1.pluginChoice,
        global: response2.global || false
    };
}
export async function interactiveScheduleAdd() {
    const response1 = await prompts({
        type: 'text',
        name: 'name',
        message: 'Task name?',
        validate: (value) => value.length > 0 || 'Name is required'
    }, { onCancel });
    const response2 = await prompts({
        type: 'select',
        name: 'schedulePreset',
        message: 'Schedule frequency?',
        choices: [
            { title: '@hourly', value: '@hourly' },
            { title: '@daily', value: '@daily' },
            { title: '@weekly', value: '@weekly' },
            { title: '@monthly', value: '@monthly' },
            { title: 'Custom cron', value: 'custom' }
        ],
        initial: 1
    }, { onCancel });
    let customSchedule = '';
    if (response2.schedulePreset === 'custom') {
        const customResponse = await prompts({
            type: 'text',
            name: 'value',
            message: 'Cron (e.g., "0 9 * * 1-5"):',
            validate: (value) => value.split(' ').length === 5 || '5 parts required'
        }, { onCancel });
        customSchedule = customResponse.value || '';
    }
    const response3 = await prompts({
        type: 'text',
        name: 'command',
        message: 'Command to run?',
        initial: 'forge doctor'
    }, { onCancel });
    return {
        name: response1.name,
        schedule: response2.schedulePreset === 'custom' ? customSchedule : response2.schedulePreset,
        command: response3.command
    };
}
export async function interactiveWorkspaceSwitch() {
    const workspaces = await loadWorkspaces();
    if (workspaces.length === 0) {
        console.log(chalk.yellow('No workspaces configured.'));
        return null;
    }
    const choices = workspaces.map(w => ({
        title: `${w.name} ${w.isDefault ? '(default)' : ''}`,
        value: w.id
    }));
    const response = await prompts({
        type: 'select',
        name: 'workspaceId',
        message: 'Switch to which workspace?',
        choices,
        initial: workspaces.findIndex(w => w.isDefault)
    }, { onCancel });
    return response.workspaceId || null;
}
export async function interactiveMainMenu() {
    const choices = [
        { title: '🚀 Start dev server', value: 'dev' },
        { title: '📊 Check status', value: 'status' },
        { title: '🔧 Run diagnostics', value: 'doctor' },
        { title: '📦 Create project', value: 'init' },
        { title: '🔌 Install plugin', value: 'plugin' },
        { title: '⏰ Schedule task', value: 'schedule' },
        { title: '💼 Switch workspace', value: 'workspace' },
        { title: '⚙️  Configure', value: 'config' },
        { title: '📖 Documentation', value: 'docs' },
        { title: '❌ Exit', value: 'exit' }
    ];
    const response = await prompts({
        type: 'select',
        name: 'action',
        message: 'What would you like to do?',
        choices,
        initial: 0
    }, { onCancel });
    return response.action || 'exit';
}
export async function confirm(message) {
    const response = await prompts({
        type: 'confirm',
        name: 'confirmed',
        message,
        initial: false
    }, { onCancel });
    return response.confirmed || false;
}
//# sourceMappingURL=interactive.js.map