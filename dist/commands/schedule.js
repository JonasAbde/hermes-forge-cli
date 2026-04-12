import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { loadTasks, addTask, removeTask, updateTask, runTask, validateCronExpression, parseSchedule, getTaskLogs, cleanOldLogs } from '../lib/scheduler.js';
import { printHeader, printSuccess, printError, printInfo, printWarning } from '../lib/output.js';
const program = new Command('schedule')
    .description('Task scheduler for recurring Forge operations')
    .addCommand(new Command('list')
    .description('List all scheduled tasks')
    .alias('ls')
    .option('--json', 'output as JSON')
    .action(async (options) => {
    const tasks = await loadTasks();
    if (options.json) {
        console.log(JSON.stringify(tasks, null, 2));
        return;
    }
    printHeader('Scheduled Tasks');
    if (tasks.length === 0) {
        printInfo('No scheduled tasks');
        printInfo('Create one with: forge schedule add <name> <schedule> <command>');
        return;
    }
    const { default: Table } = await import('cli-table3');
    const table = new Table({
        head: [chalk.bold('Name'), chalk.bold('Schedule'), chalk.bold('Status'), chalk.bold('Last Run'), chalk.bold('Next Run')],
        colWidths: [20, 15, 12, 20, 20],
        style: { head: ['cyan'] }
    });
    for (const task of tasks) {
        const status = task.enabled
            ? (task.lastStatus === 'failed' ? chalk.red('⚠ FAILED') : chalk.green('● Enabled'))
            : chalk.gray('○ Disabled');
        const lastRun = task.lastRun
            ? new Date(task.lastRun).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            : chalk.gray('Never');
        const nextRun = task.nextRun
            ? new Date(task.nextRun).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            : chalk.gray('N/A');
        table.push([
            task.name,
            chalk.yellow(task.schedule),
            status,
            lastRun,
            nextRun
        ]);
    }
    console.log(table.toString());
    printInfo(`\nTotal: ${tasks.length} task(s)`);
}))
    .addCommand(new Command('add')
    .description('Add a new scheduled task')
    .argument('<name>', 'task name')
    .argument('<schedule>', 'cron expression or preset (@hourly, @daily, @weekly)')
    .argument('<command>', 'command to execute')
    .option('-d, --dir <path>', 'working directory')
    .option('--disable', 'create disabled')
    .action(async (name, schedule, command, options) => {
    printHeader('Add Scheduled Task');
    // Validate schedule
    const validation = validateCronExpression(schedule);
    if (!validation.valid) {
        printError(`Invalid schedule: ${validation.error}`);
        printInfo('Examples: @daily, @hourly, @weekly, "0 9 * * 1-5" (weekdays at 9am)');
        process.exit(1);
    }
    // Show next run time
    const nextRun = parseSchedule(schedule);
    if (nextRun) {
        printInfo(`Next run: ${chalk.cyan(nextRun.toLocaleString())}`);
    }
    try {
        const task = await addTask({
            name,
            command,
            schedule,
            enabled: !options.disable,
            workingDirectory: options.dir
        });
        printSuccess(`Task created: ${chalk.yellow(name)}`);
        printInfo(`Schedule: ${chalk.cyan(schedule)}`);
        printInfo(`Command: ${chalk.gray(command)}`);
        if (options.dir) {
            printInfo(`Directory: ${chalk.gray(options.dir)}`);
        }
    }
    catch (error) {
        printError(error.message);
        process.exit(1);
    }
}))
    .addCommand(new Command('remove')
    .description('Remove a scheduled task')
    .alias('rm')
    .argument('<name>', 'task name or ID')
    .action(async (name) => {
    printHeader('Remove Task');
    const tasks = await loadTasks();
    const task = tasks.find(t => t.name === name || t.id === name);
    if (!task) {
        printError(`Task not found: ${name}`);
        process.exit(1);
    }
    printWarning(`Removing task: ${chalk.bold(task.name)}`);
    printInfo(`Command: ${chalk.gray(task.command)}`);
    const success = await removeTask(task.id);
    if (success) {
        printSuccess('Task removed');
    }
    else {
        printError('Failed to remove task');
        process.exit(1);
    }
}))
    .addCommand(new Command('enable')
    .description('Enable a scheduled task')
    .argument('<name>', 'task name or ID')
    .action(async (name) => {
    const tasks = await loadTasks();
    const task = tasks.find(t => t.name === name || t.id === name);
    if (!task) {
        printError(`Task not found: ${name}`);
        process.exit(1);
    }
    await updateTask(task.id, { enabled: true });
    printSuccess(`Task enabled: ${chalk.yellow(task.name)}`);
}))
    .addCommand(new Command('disable')
    .description('Disable a scheduled task')
    .argument('<name>', 'task name or ID')
    .action(async (name) => {
    const tasks = await loadTasks();
    const task = tasks.find(t => t.name === name || t.id === name);
    if (!task) {
        printError(`Task not found: ${name}`);
        process.exit(1);
    }
    await updateTask(task.id, { enabled: false });
    printSuccess(`Task disabled: ${chalk.yellow(task.name)}`);
}))
    .addCommand(new Command('run')
    .description('Run a task immediately (manual execution)')
    .argument('<name>', 'task name or ID')
    .action(async (name) => {
    printHeader('Run Task');
    const tasks = await loadTasks();
    const task = tasks.find(t => t.name === name || t.id === name);
    if (!task) {
        printError(`Task not found: ${name}`);
        process.exit(1);
    }
    printInfo(`Running: ${chalk.yellow(task.name)}`);
    printInfo(`Command: ${chalk.gray(task.command)}`);
    console.log('');
    const spinner = ora('Executing...').start();
    try {
        const result = await runTask(task);
        spinner.stop();
        if (result.success) {
            printSuccess(`Completed in ${result.duration}ms`);
        }
        else {
            printError(`Failed after ${result.duration}ms`);
        }
        if (result.output) {
            console.log('');
            console.log(chalk.gray('─'.repeat(60)));
            console.log(result.output);
            console.log(chalk.gray('─'.repeat(60)));
        }
    }
    catch (error) {
        spinner.fail('Execution failed');
        printError(error.message);
        process.exit(1);
    }
}))
    .addCommand(new Command('logs')
    .description('Show task execution logs')
    .argument('[name]', 'task name or ID (optional)')
    .option('-n, --lines <number>', 'number of log entries', '10')
    .option('--clean', 'clean old logs older than 7 days')
    .action(async (name, options) => {
    if (options.clean) {
        const deleted = await cleanOldLogs(7);
        printSuccess(`Cleaned ${deleted} old log file(s)`);
        return;
    }
    printHeader('Task Logs');
    let taskId;
    if (name) {
        const tasks = await loadTasks();
        const task = tasks.find(t => t.name === name || t.id === name);
        if (task) {
            taskId = task.id;
        }
        else {
            printError(`Task not found: ${name}`);
            process.exit(1);
        }
    }
    const logs = await getTaskLogs(taskId, Number(options.lines));
    if (logs.length === 0) {
        printInfo('No logs found');
        return;
    }
    for (const log of logs) {
        console.log(chalk.bold.cyan(`\n[${log.date.toLocaleString()}]`));
        if (log.taskId) {
            const tasks = await loadTasks();
            const task = tasks.find(t => t.id === log.taskId);
            console.log(chalk.gray(`Task: ${task?.name || log.taskId}`));
        }
        console.log(chalk.gray('─'.repeat(60)));
        console.log(log.content.slice(0, 2000)); // Limit output
        if (log.content.length > 2000) {
            console.log(chalk.gray('... (truncated)'));
        }
    }
}))
    .addCommand(new Command('presets')
    .description('Show available schedule presets')
    .action(() => {
    printHeader('Schedule Presets');
    const presets = [
        { preset: '@reboot', desc: 'Run once at startup', example: 'forge schedule add backup @reboot "forge backup create startup"' },
        { preset: '@hourly', desc: 'Run every hour', example: 'forge schedule add check @hourly "forge doctor"' },
        { preset: '@daily', desc: 'Run every day at midnight', example: 'forge schedule add backup @daily "forge backup create daily"' },
        { preset: '@weekly', desc: 'Run every Sunday at midnight', example: 'forge schedule add report @weekly "npm run weekly-report"' },
        { preset: '@monthly', desc: 'Run on 1st of every month', example: 'forge schedule add monthly @monthly "npm run monthly-stats"' },
    ];
    console.log(chalk.bold('\nPresets:'));
    for (const p of presets) {
        console.log(`\n  ${chalk.yellow(p.preset.padEnd(12))} ${p.desc}`);
        console.log(`  ${chalk.gray('Example:')} ${p.example}`);
    }
    console.log(chalk.bold('\n\nCron Expressions (5 parts):'));
    console.log(`  ${chalk.cyan('minute hour day month weekday')}`);
    console.log(`  ${chalk.gray('0-59  0-23  1-31  1-12  0-7 (0,7=Sunday)')}`);
    console.log(chalk.bold('\nExamples:'));
    console.log(`  "${chalk.yellow('0 9 * * 1-5')}"   Weekdays at 9:00 AM`);
    console.log(`  "${chalk.yellow('*/15 * * * *')}"  Every 15 minutes`);
    console.log(`  "${chalk.yellow('0 0 * * 0')}"     Every Sunday at midnight`);
    console.log(`  "${chalk.yellow('0 2 1 * *')}"     1st of month at 2:00 AM`);
}));
export default program;
//# sourceMappingURL=schedule.js.map