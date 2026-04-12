import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
export const spinner = ora();
export function printHeader(text) {
    console.log(chalk.bold.blue('\n' + '='.repeat(60)));
    console.log(chalk.bold.blue(`  ${text}`));
    console.log(chalk.bold.blue('='.repeat(60) + '\n'));
}
export function printSuccess(text) {
    console.log(chalk.green('✓') + ' ' + text);
}
export function printError(text) {
    console.log(chalk.red('✗') + ' ' + text);
}
export function printWarning(text) {
    console.log(chalk.yellow('⚠') + ' ' + text);
}
export function printInfo(text) {
    console.log(chalk.cyan('ℹ') + ' ' + text);
}
export function createServiceTable(data) {
    const table = new Table({
        head: [
            chalk.bold('Service'),
            chalk.bold('Port'),
            chalk.bold('Status'),
            chalk.bold('URL')
        ],
        colWidths: [25, 8, 12, 35],
        style: { head: ['cyan'] }
    });
    data.forEach(row => {
        let statusColor = row.status.includes('UP') ? chalk.green : chalk.red;
        if (row.status.includes('WARN'))
            statusColor = chalk.yellow;
        table.push([
            row.name,
            row.port,
            statusColor(row.status),
            row.url || row.message || ''
        ]);
    });
    console.log(table.toString());
}
export function box(text, title) {
    console.log(chalk.gray('┌' + '─'.repeat(60) + '┐'));
    if (title) {
        console.log(chalk.gray('│ ') + chalk.bold(title) + chalk.gray(' '.repeat(58 - title.length) + '│'));
        console.log(chalk.gray('├' + '─'.repeat(60) + '┤'));
    }
    text.split('\n').forEach(line => {
        console.log(chalk.gray('│ ') + line + chalk.gray(' '.repeat(58 - line.length) + '│'));
    });
    console.log(chalk.gray('└' + '─'.repeat(60) + '┘\n'));
}
//# sourceMappingURL=output.js.map