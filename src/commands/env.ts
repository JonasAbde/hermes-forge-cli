import { Command } from 'commander';
import chalk from 'chalk';
import { 
  loadEnv, 
  getActiveEnv, 
  setActiveEnv, 
  listEnvironments, 
  validateEnv, 
  diffEnvironments,
  getMaskedVariables,
  formatEnvForDisplay,
  getEnvFilePath
} from '../lib/envManager.js';
import { printHeader, printSuccess, printError, printWarning, printInfo } from '../lib/output.js';

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

const program = new Command('env')
  .description('Manage environment configurations')
  .addCommand(
    new Command('use')
      .description('Switch to a different environment')
      .argument('<environment>', 'environment name (e.g., local, staging, prod)')
      .action(async (environment) => {
        printHeader(`Switching Environment`);
        
        try {
          // Validate that the environment file exists
          await loadEnv(environment);
          
          // Set as active
          setActiveEnv(environment);
          printSuccess(`Active environment set to: ${chalk.bold(environment)}`);
          
          // Show preview
          const env = await loadEnv(environment);
          const masked = getMaskedVariables(env);
          printInfo(`\nEnvironment variables (${masked.length} total):`);
          
          const { default: Table } = await import('cli-table3');
          const table = new Table({
            head: [chalk.bold('Variable'), chalk.bold('Value')],
            colWidths: [30, 50],
            style: { head: ['cyan'] }
          });
          
          masked.slice(0, 10).forEach(({ key, value, masked }) => {
            table.push([key, masked ? chalk.yellow(value) : value]);
          });
          
          if (masked.length > 10) {
            table.push([chalk.gray('...'), chalk.gray(`and ${masked.length - 10} more`)]);
          }
          
          console.log(table.toString());
          
        } catch (error: unknown) {
          printError(`Failed to switch environment: ${errorMessage(error)}`);
          printInfo(`Create the file with: touch ${getEnvFilePath(environment)}`);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('list')
      .description('List all available environments')
      .action(async () => {
        printHeader('Available Environments');
        
        const activeEnv = getActiveEnv();
        const envs = await listEnvironments();
        
        if (envs.length === 0) {
          printWarning('No environment files found.');
          printInfo('Create one with: touch .env.local');
          return;
        }
        
        const { default: Table } = await import('cli-table3');
        const table = new Table({
          head: [chalk.bold('Environment'), chalk.bold('Status'), chalk.bold('File')],
          colWidths: [20, 15, 30],
          style: { head: ['cyan'] }
        });
        
        envs.forEach(env => {
          const isActive = env === activeEnv;
          table.push([
            env,
            isActive ? chalk.green('● active') : chalk.gray('○ inactive'),
            isActive ? chalk.bold(`.env.${env}`) : `.env.${env}`
          ]);
        });
        
        console.log(table.toString());
        printInfo(`\nActive environment: ${chalk.bold(activeEnv)}`);
      })
  )
  .addCommand(
    new Command('validate')
      .description('Validate environment against .env.example')
      .argument('[environment]', 'environment to validate (default: active)')
      .option('--fix', 'auto-fix missing keys from .env.example')
      .action(async (environment, options) => {
        const env = environment || getActiveEnv();
        printHeader(`Validating Environment: ${env}`);
        
        try {
          const validation = await validateEnv(env);
          
          if (validation.valid) {
            printSuccess(`Environment ${chalk.bold(env)} is valid!`);
            if (validation.extra.length > 0) {
              printWarning(`Extra keys (not in example): ${validation.extra.join(', ')}`);
            }
            return;
          }
          
          printError(`Environment ${chalk.bold(env)} has issues:`);
          
          if (validation.missing.includes('FILE_NOT_FOUND')) {
            printError(`  • Environment file .env.${env} not found`);
          } else if (validation.missing.length > 0) {
            printError(`  • Missing keys: ${validation.missing.join(', ')}`);
            
            if (options.fix) {
              printInfo(`\nFixing missing keys...`);
              printWarning('Not yet implemented: copy from .env.example');
            }
          }
          
          if (validation.extra.length > 0) {
            printWarning(`  • Extra keys: ${validation.extra.join(', ')}`);
          }
          
          process.exit(1);
        } catch (error: unknown) {
          printError(`Validation failed: ${errorMessage(error)}`);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('diff')
      .description('Compare two environments')
      .argument('<env1>', 'first environment')
      .argument('<env2>', 'second environment')
      .action(async (env1, env2) => {
        printHeader(`Comparing: ${env1} vs ${env2}`);
        
        try {
          const diff = await diffEnvironments(env1, env2);
          
          if (diff.onlyIn1.length === 0 && diff.onlyIn2.length === 0 && diff.different.length === 0) {
            printSuccess('Environments are identical!');
            return;
          }
          
          const { default: Table } = await import('cli-table3');
          
          if (diff.onlyIn1.length > 0) {
            console.log(chalk.red(`\nOnly in ${env1}:`));
            diff.onlyIn1.forEach(key => console.log(`  - ${key}`));
          }
          
          if (diff.onlyIn2.length > 0) {
            console.log(chalk.red(`\nOnly in ${env2}:`));
            diff.onlyIn2.forEach(key => console.log(`  - ${key}`));
          }
          
          if (diff.different.length > 0) {
            console.log(chalk.yellow(`\nDifferent values:`));
            const table = new Table({
              head: [chalk.bold('Key'), chalk.bold(env1), chalk.bold(env2)],
              colWidths: [30, 35, 35],
              style: { head: ['cyan'] }
            });
            
            diff.different.forEach(({ key, val1, val2 }) => {
              const masked1 = formatEnvForDisplay({ [key]: val1 })[0].value;
              const masked2 = formatEnvForDisplay({ [key]: val2 })[0].value;
              table.push([key, masked1, masked2]);
            });
            
            console.log(table.toString());
          }
        } catch (error: unknown) {
          printError(`Comparison failed: ${errorMessage(error)}`);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('show')
      .description('Display environment variables')
      .argument('[environment]', 'environment to show (default: active)')
      .option('--raw', 'show unmasked values (secrets visible)')
      .action(async (environment, options) => {
        const env = environment || getActiveEnv();
        
        // SECURITY: Unmasked output is only available via explicit --raw opt-in.
        if (options.raw) {
          printWarning('⚠ Showing unmasked values including secrets!');
        }
        
        printHeader(`Environment: ${env}`);
        
        try {
          const vars = await loadEnv(env);
          const display = formatEnvForDisplay(vars, options.raw);
          
          if (display.length === 0) {
            printWarning('No variables found in environment file.');
            return;
          }
          
          const { default: Table } = await import('cli-table3');
          const table = new Table({
            head: [chalk.bold('Variable'), chalk.bold('Value')],
            colWidths: [30, 50],
            style: { head: ['cyan'] }
          });
          
          display.forEach(({ key, value }) => {
            const isSecret = !options.raw && value.includes('*');
            table.push([key, isSecret ? chalk.yellow(value) : value]);
          });
          
          console.log(table.toString());
          printInfo(`\nTotal variables: ${display.length}`);
        } catch (error: unknown) {
          printError(`Failed to load environment: ${errorMessage(error)}`);
          process.exit(1);
        }
      })
  );

export default program;
