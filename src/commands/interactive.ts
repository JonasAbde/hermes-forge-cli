import { Command } from 'commander';
import chalk from 'chalk';
import { 
  interactiveMainMenu,
  interactiveDev,
  interactiveInit,
  interactivePluginInstall,
  interactiveScheduleAdd,
  interactiveWorkspaceSwitch,
  confirm
} from '../lib/interactive.js';
import { printHeader, printInfo, printSuccess, printError } from '../lib/output.js';
import { execa } from 'execa';

const program = new Command('interactive')
  .description('Interactive mode with guided prompts')
  .alias('i')
  .action(async () => {
    printHeader('Forge Interactive Mode');
    printInfo('Use arrow keys to navigate, Enter to select\n');
    
    let running = true;
    
    while (running) {
      const action = await interactiveMainMenu();
      
      switch (action) {
        case 'dev': {
          const options = await interactiveDev();
          printInfo(`\nStarting ${options.mode}...`);
          running = false;
          
          try {
            await execa('npm', ['run', 'dev:with-docs'], {
              stdio: 'inherit',
              cwd: process.cwd()
            });
          } catch {
            // User probably ctrl+c'd
          }
          break;
        }
        
        case 'status': {
          printInfo('\nChecking status...\n');
          try {
            await execa('forge', ['status'], { stdio: 'inherit' });
          } catch {
            // Ignore
          }
          console.log('');
          break;
        }
        
        case 'doctor': {
          printInfo('\nRunning diagnostics...\n');
          try {
            await execa('forge', ['doctor'], { stdio: 'inherit' });
          } catch {
            // Ignore
          }
          console.log('');
          break;
        }
        
        case 'init': {
          const options = await interactiveInit();
          printInfo(`\nCreating ${options.template} project: ${options.projectName}`);
          
          try {
            await execa('forge', ['init', options.projectName, '--template', options.template], {
              stdio: 'inherit'
            });
          } catch (error: any) {
            printError(error.message);
          }
          
          const continueSession = await confirm('Continue in interactive mode?');
          running = continueSession;
          break;
        }
        
        case 'plugin': {
          const options = await interactivePluginInstall();
          printInfo(`\nInstalling ${options.source}...`);
          
          try {
            const args = ['plugin', 'install', options.source];
            if (options.global) args.push('--global');
            await execa('forge', args, { stdio: 'inherit' });
          } catch (error: any) {
            printError(error.message);
          }
          
          const continueSession = await confirm('Continue in interactive mode?');
          running = continueSession;
          break;
        }
        
        case 'schedule': {
          const options = await interactiveScheduleAdd();
          printInfo(`\nAdding scheduled task: ${options.name}`);
          
          try {
            await execa('forge', ['schedule', 'add', options.name, options.schedule, options.command], {
              stdio: 'inherit'
            });
          } catch (error: any) {
            printError(error.message);
          }
          
          const continueSession = await confirm('Continue in interactive mode?');
          running = continueSession;
          break;
        }
        
        case 'workspace': {
          const workspaceId = await interactiveWorkspaceSwitch();
          if (workspaceId) {
            printInfo('\nSwitching workspace...');
            try {
              await execa('forge', ['workspace', 'switch', workspaceId], { stdio: 'inherit' });
            } catch (error: any) {
              printError(error.message);
            }
          }
          
          const continueSession = await confirm('Continue in interactive mode?');
          running = continueSession;
          break;
        }
        
        case 'config':
          printInfo('\nConfig: Use "forge config" command directly');
          break;
        
        case 'docs': {
          printInfo('\nStarting documentation server...');
          running = false;
          
          try {
            await execa('forge', ['docs'], { stdio: 'inherit' });
          } catch {
            // Ignore
          }
          break;
        }
        
        case 'exit':
        default:
          printInfo('\nGoodbye!');
          running = false;
          break;
      }
    }
  });

export default program;
